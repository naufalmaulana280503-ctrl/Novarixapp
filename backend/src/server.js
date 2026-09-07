const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const http = require('http');
const jwt = require('jsonwebtoken');
const { initDatabase, pool } = require('./models/db');

const app = express();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
if (IS_PRODUCTION && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET wajib dikonfigurasi di production');
}
const DEFAULT_MOBILE_ORIGINS = ['capacitor://localhost', 'http://localhost', 'https://localhost'];
const PRODUCTION_ORIGINS = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)
  .concat(DEFAULT_MOBILE_ORIGINS);

// Any loopback origin is allowed in development so the app works no matter
// whether it is opened via localhost, 127.0.0.1 or [::1], and on any dev port.
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

const isAllowedOrigin = (origin) => {
  // Same-origin / server-to-server requests send no Origin header.
  if (!origin) return true;
  const normalized = origin.replace(/\/+$/, '');
  if (PRODUCTION_ORIGINS.includes(normalized)) return true;
  return !IS_PRODUCTION && LOOPBACK_ORIGIN.test(normalized);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS Novarix`));
  },
  credentials: true,
};

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/users', require('./routes/users'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/reactions', require('./routes/reactions'));
app.use('/api/gifts', require('./routes/gifts'));
app.use('/api/stickers', require('./routes/stickers'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/moderation', require('./routes/moderation'));
app.use('/api/watermarks', require('./routes/watermarks'));
app.use('/api/camera', require('./routes/camera'));
app.use('/api/editor', require('./routes/editor'));
app.use('/api/ai', require('./routes/ai'));

// Verification routes (eligibility & submission)
app.use('/api/verification', require('./routes/verification'));

// Debates (anonymous arena)
app.use('/api/debates', require('./routes/debates'));

// Admin verification review endpoints
app.use('/api/admin/verification', require('./routes/admin_verification'));

// Premium / monetization routes
app.use('/api/premium', require('./routes/premium'));

// Reports (public/verified reporting)
app.use('/api/reports', require('./routes/reports'));
app.use('/api/time-capsules', require('./routes/timeCapsules'));
app.use('/api/anon-confess', require('./routes/anonConfess'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/bookmarks', require('./routes/bookmarks'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Novarix API is running' });
});

const API_PORT = parseInt(process.env.PORT, 10) || 5000;
const SIGNALING_PORT = parseInt(process.env.SIGNALING_PORT, 10) || 4000;

initDatabase().then(() => {
  // Railway exposes one public HTTP port. REST and Socket.IO share it.
  const apiServer = http.createServer(app);
  apiServer.listen(API_PORT, () => {
    console.log(`Novarix backend running on port ${API_PORT}`);
  });

  // ===== SOCKET.IO SIGNALING + REALTIME CHAT SERVER =====
  let io = null;
  try {
    const { Server } = require('socket.io');
    io = new Server(apiServer, {
      cors: {
        origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
        credentials: true,
      },
      path: '/socket.io',
    });

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token
          || socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
        if (!token || !process.env.JWT_SECRET) {
          return next(new Error('Authentication required'));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await pool.query('SELECT id, display_name, username FROM users WHERE id = ?', [decoded.userId]);
        if (!users.length) return next(new Error('Invalid session'));
        socket.data.userId = String(users[0].id);
        socket.data.displayName = users[0].display_name || users[0].username || 'User';
        return next();
      } catch (err) {
        return next(new Error('Invalid or expired session'));
      }
    });

    // Map: userId -> socketId (for targeted DM push notifications)
    const userSockets = new Map();
    // Map: groupId -> Set<socketId>
    const groupSockets = new Map();
    // Map: roomId (call) -> Set<socketId>
    const callRooms = new Map();

    io.on('connection', (socket) => {
      console.log('[SIGNALING] Client connected:', socket.id);
      const isGroupMember = async (groupId) => {
        const gid = Number(groupId);
        if (!Number.isInteger(gid) || gid <= 0) return false;
        const [rows] = await pool.query(
          'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?',
          [gid, socket.data.userId]
        );
        return rows.length > 0;
      };
      const isCallParticipant = (roomId) => {
        const members = callRooms.get(String(roomId));
        return !!members && members.has(socket.id);
      };

      // ---------- AUTH / PRESENCE ----------
      socket.on('user:join', ({ userId, displayName }) => {
        const authenticatedUserId = socket.data.userId;
        if (!authenticatedUserId) return;
        userSockets.set(authenticatedUserId, socket.id);
        console.log(`[SOCKET] User ${authenticatedUserId} (${socket.data.displayName}) joined as socket ${socket.id}`);
        socket.broadcast.emit('presence:online', { userId: authenticatedUserId, socketId: socket.id });
      });

      // ---------- REALTIME CHAT (DM) ----------
      socket.on('chat:sendDM', ({ receiverId, message }) => {
        const targetSocketId = userSockets.get(String(receiverId));
        if (targetSocketId) {
          io.to(targetSocketId).emit('chat:newDM', {
            fromUserId: socket.data.userId,
            fromDisplayName: socket.data.displayName,
            message,
            timestamp: Date.now(),
          });
        }
        // Also send back to sender (for multi-tab consistency)
        if (targetSocketId !== socket.id) {
          socket.emit('chat:sentDM', { receiverId, message, timestamp: Date.now() });
        }
      });

      // ---------- GROUP CHAT ----------
      socket.on('group:join', async ({ groupId }) => {
        if (!groupId) return;
        if (!(await isGroupMember(groupId))) return;
        const gid = String(groupId);
        socket.join(`group:${gid}`);
        if (!groupSockets.has(gid)) groupSockets.set(gid, new Set());
        groupSockets.get(gid).add(socket.id);
        console.log(`[SOCKET] Socket ${socket.id} joined group ${gid}`);
      });

      socket.on('group:leave', ({ groupId }) => {
        if (!groupId) return;
        const gid = String(groupId);
        socket.leave(`group:${gid}`);
        const set = groupSockets.get(gid);
        if (set) set.delete(socket.id);
      });

      socket.on('group:sendMessage', async ({ groupId, message, senderInfo, payload }) => {
        if (!groupId) return;
        if (!(await isGroupMember(groupId))) return;
        const gid = String(groupId);
        io.to(`group:${gid}`).emit('group:newMessage', {
          groupId: gid,
          senderId: socket.data.userId,
          senderInfo: senderInfo || {
            displayName: socket.data.displayName,
          },
          message,
          payload: payload || null,
          timestamp: Date.now(),
        });
      });

      // ---------- WEBRTC CALLS (SIGNALING) ----------
      // Initiator starts a call
      socket.on('call:start', async ({ callId, type, roomId, groupId, targetUserId, offer, initiatorInfo }) => {
        if (groupId && !(await isGroupMember(groupId))) return;
        if (callId) {
          const [calls] = await pool.query(
            'SELECT 1 FROM calls WHERE id = ? AND (caller_id = ? OR receiver_id = ?)',
            [callId, socket.data.userId, socket.data.userId]
          );
          if (!calls.length) return;
        }
        const room = String(roomId || callId || `call_${Date.now()}`);
        socket.join(room);
        if (!callRooms.has(room)) callRooms.set(room, new Set());
        callRooms.get(room).add(socket.id);

        const payload = {
          callId, type, roomId: room, groupId,
          offer,
          fromSocket: socket.id,
          fromUserId: socket.data.userId,
          initiatorInfo: initiatorInfo || { displayName: socket.data.displayName },
          timestamp: Date.now(),
        };

        // Send to specific user (1-to-1 call)
        if (targetUserId) {
          const sid = userSockets.get(String(targetUserId));
          if (sid) io.to(sid).emit('call:incoming', payload);
        }
        // Broadcast to entire group
        if (groupId) {
          socket.to(`group:${String(groupId)}`).emit('call:incoming', payload);
        }
        socket.emit('call:started', { ...payload, roomId: room });
      });

      // Callee accepts -> sends answer back
      socket.on('call:answer', async ({ roomId, callId, answer, toSocket }) => {
        if (!roomId) return;
        if (!isCallParticipant(roomId)) {
          const numericCallId = Number(callId || roomId);
          if (!Number.isInteger(numericCallId)) return;
          const [calls] = await pool.query(
            'SELECT 1 FROM calls WHERE id = ? AND (caller_id = ? OR receiver_id = ?)',
            [numericCallId, socket.data.userId, socket.data.userId]
          );
          if (!calls.length) return;
        }
        socket.join(String(roomId));
        if (!callRooms.has(String(roomId))) callRooms.set(String(roomId), new Set());
        callRooms.get(String(roomId)).add(socket.id);
        socket.join(String(roomId));
        const set = callRooms.get(String(roomId));
        if (set) set.add(socket.id);
        const target = toSocket || null;
        const payload = {
          roomId,
          answer,
          fromSocket: socket.id,
          fromUserId: socket.data.userId,
        };
        if (target) io.to(target).emit('call:answered', payload);
        else socket.to(String(roomId)).emit('call:answered', payload);
      });

      // ICE candidate trickle
      socket.on('call:ice', ({ roomId, candidate, toSocket }) => {
        if (!roomId) return;
        if (!isCallParticipant(roomId)) return;
        const payload = { roomId, candidate, fromSocket: socket.id };
        if (toSocket) io.to(toSocket).emit('call:ice', payload);
        else socket.to(String(roomId)).emit('call:ice', payload);
      });

      // Call controls
      socket.on('call:toggleMic', ({ roomId, muted }) => {
        if (!roomId) return;
        if (!isCallParticipant(roomId)) return;
        socket.to(String(roomId)).emit('call:peerMicToggle', {
          roomId, userId: socket.data.userId, muted,
        });
      });
      socket.on('call:toggleCam', ({ roomId, off }) => {
        if (!roomId) return;
        if (!isCallParticipant(roomId)) return;
        socket.to(String(roomId)).emit('call:peerCamToggle', {
          roomId, userId: socket.data.userId, off,
        });
      });
      socket.on('call:end', ({ roomId, reason }) => {
        if (!roomId) return;
        if (!isCallParticipant(roomId)) return;
        socket.to(String(roomId)).emit('call:ended', {
          roomId, reason, byUserId: socket.data.userId, bySocket: socket.id,
        });
        const set = callRooms.get(String(roomId));
        if (set) set.delete(socket.id);
        socket.leave(String(roomId));
      });

      // ---------- TYPING INDICATORS ----------
      socket.on('chat:typing', ({ conversationId, isTyping, toUserId, toGroupId }) => {
        const payload = {
          conversationId,
          isTyping,
          fromUserId: socket.data.userId,
          fromDisplayName: socket.data.displayName,
        };
        if (toUserId) {
          const sid = userSockets.get(String(toUserId));
          if (sid) io.to(sid).emit('chat:typing', payload);
        } else if (toGroupId) {
          socket.to(`group:${String(toGroupId)}`).emit('chat:typing', payload);
        }
      });

      // ---------- DISCONNECT ----------
      socket.on('disconnect', () => {
        console.log('[SIGNALING] Client disconnected:', socket.id);
        const uid = socket.data.userId;
        if (uid) {
          userSockets.delete(String(uid));
          socket.broadcast.emit('presence:offline', { userId: uid, socketId: socket.id });
        }
        // Clean up group rooms
        for (const [gid, set] of groupSockets.entries()) {
          set.delete(socket.id);
        }
        for (const [roomId, set] of callRooms.entries()) {
          set.delete(socket.id);
          if (set.size === 0) {
            callRooms.delete(roomId);
            io.emit('call:ended', { roomId, reason: 'empty', bySocket: socket.id });
          }
        }
      });
    });

    console.log(`Novarix Socket.IO (signaling + chat) sharing port ${API_PORT}`);
  } catch (err) {
    console.warn('[WARN] socket.io tidak tersedia. Fitur realtime chat dan calls tidak akan berjalan.');
    console.warn('[WARN] Jalankan: npm install socket.io di folder backend');
    console.warn('[WARN] Detail error:', err.message);
  }
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
