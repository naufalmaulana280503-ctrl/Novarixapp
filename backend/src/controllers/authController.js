const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../models/db');
const { sendConfirmationEmail, sendPasswordResetEmail, sendLoginNotificationEmail } = require('../services/email');
const crypto = require('crypto');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const getRequestMeta = (req) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const rawIp = forwarded || req.ip || req.socket?.remoteAddress || '';
  return {
    ip: rawIp.replace(/^::ffff:/, '') || 'tidak diketahui',
    userAgent: req.get('User-Agent') || 'tidak diketahui',
    at: new Date(),
  };
};

// Fire-and-forget: an email hiccup must never break or slow down the login.
const notifyLogin = (user, req, provider) => {
  if (!user?.email) return;
  sendLoginNotificationEmail(user.email, {
    ...getRequestMeta(req),
    provider,
    displayName: user.display_name || user.username,
  }).catch((err) => console.error('[EMAIL] notifikasi login gagal:', err.message));
};

const oauthLogin = async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!accessToken) return res.status(401).json({ message: 'Supabase access token is required' });
    const supabaseServerKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!process.env.SUPABASE_URL || !supabaseServerKey) {
      return res.status(503).json({ message: 'Supabase OAuth backend belum dikonfigurasi' });
    }
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: supabaseServerKey },
    });
    if (!response.ok) return res.status(401).json({ message: 'Supabase session tidak valid' });
    const identity = await response.json();
    const email = identity.email;
    if (!email) return res.status(400).json({ message: 'Akun OAuth tidak memiliki email' });

    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    let user = existing[0];
    if (!user) {
      const baseUsername = (email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'user');
      let username = baseUsername;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const [taken] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (!taken.length) break;
        username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 30);
      }
      const displayName = identity.user_metadata?.full_name || identity.user_metadata?.name || username;
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
      const [result] = await pool.query(
        'INSERT INTO users (email, password_hash, username, display_name, avatar_url, email_confirmed) VALUES (?, ?, ?, ?, ?, ?)',
        [email, passwordHash, username, displayName, identity.user_metadata?.avatar_url || null, 1]
      );
      const [created] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = created[0];
    }
    notifyLogin(user, req, identity.app_metadata?.provider || 'google');
    res.json({
      token: generateToken(user.id),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        emailConfirmed: user.email_confirmed,
        isVerified: user.is_verified,
        verifiedBadge: computeVerifiedBadge(user),
        followersCount: user.followers_count,
        followingCount: user.following_count,
        postsCount: user.posts_count,
        likesReceived: user.likes_received_count,
        formattedFollowers: formatNumber(user.followers_count),
        formattedFollowing: formatNumber(user.following_count),
        formattedPosts: formatNumber(user.posts_count),
        formattedLikes: formatNumber(user.likes_received_count),
      }
    });
  } catch (err) {
    console.error('OAuth login error:', err);
    res.status(500).json({ message: 'Gagal menyinkronkan login OAuth' });
  }
};

const computeVerifiedBadge = (user) => {
  if (!user) return null;
  if (user.verified_badge) return user.verified_badge;
  if (user.is_verified) return 'sun';
  const followers = user.followers_count || 0;
  const likes = user.likes_received_count || 0;
  if (followers >= 20000000 && likes >= 20000000) return 'star';
  if (followers >= 10000000 && likes >= 10000000) return 'moon';
  return null;
};

const formatNumber = (num) => {
  if (num == null) return '0';
  return Number(num).toLocaleString('id-ID');
};

const isBotUsername = (username, displayName) => {
  const suspiciousPatterns = ['bot', 'test', 'xxx', '123456', 'qwerty', 'admin'];
  const lowerUsername = (username || '').toLowerCase();
  const lowerDisplayName = (displayName || '').toLowerCase();

  if (/^[0-9]+$/.test(username)) return true;
  for (const pattern of suspiciousPatterns) {
    if (lowerUsername.includes(pattern) || lowerDisplayName.includes(pattern)) {
      return true;
    }
  }
  return false;
};

const register = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim() || null;
  const password = req.body.password;
  const username = String(req.body.username || '').trim();
  const displayName = String(req.body.displayName || '').trim();
  const { termsAccepted } = req.body;

  if (!termsAccepted) {
    return res.status(400).json({ message: 'You must accept the terms and conditions to register' });
  }

  if (!email && !phone) {
    return res.status(400).json({ message: 'Email or phone is required' });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  if (!username || username.length < 3 || username.length > 30) {
    return res.status(400).json({ message: 'Username must be between 3 and 30 characters' });
  }

  try {
    let query = 'SELECT id FROM users WHERE ';
    const params = [];
    if (email && phone) {
      query += '(email = ? OR phone = ?) OR username = ?';
      params.push(email, phone, username);
    } else if (email) {
      query += 'email = ? OR username = ?';
      params.push(email, username);
    } else if (phone) {
      query += 'phone = ? OR username = ?';
      params.push(phone, username);
    } else {
      query += 'username = ?';
      params.push(username);
    }

    const [existing] = await pool.query(query, params);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email, phone, or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const isBot = isBotUsername(username, displayName);

    const [result] = await pool.query(
      'INSERT INTO users (email, phone, password_hash, username, display_name, confirmation_token, is_bot_banned) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email || null, phone || null, passwordHash, username, displayName || username, confirmationToken, isBot ? 1 : 0]
    );

    const userId = result.insertId;
    const token = generateToken(userId);

    if (isBot) {
      await pool.query('INSERT INTO bot_checks (user_id, is_flagged_bot, flag_reason) VALUES (?, ?, ?)', [userId, 1, 'Suspicious username/display name pattern']);
    }

    // A missing/broken SMTP config must not roll back a successful signup.
    let confirmationSent = false;
    if (email) {
      try {
        confirmationSent = await sendConfirmationEmail(email, confirmationToken);
      } catch (mailError) {
        console.error('[EMAIL] email konfirmasi gagal:', mailError.message);
      }
    }

    const [user] = await pool.query('SELECT id, email, phone, username, display_name FROM users WHERE id = ?', [userId]);

    res.status(201).json({
      user: { id: user[0].id, email: user[0].email, phone: user[0].phone, username: user[0].username, displayName: user[0].display_name },
      token,
      confirmationEmailSent: confirmationSent,
      message: confirmationSent
        ? 'Registrasi berhasil. Cek email kamu untuk konfirmasi akun.'
        : 'Registrasi berhasil. Email konfirmasi belum bisa dikirim, hubungi admin atau konfirmasi nanti.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const assignVerifiedBadge = async (req, res) => {
  try {
    const requesterId = req.userId;
    const { userId, badge } = req.body;

    const [requester] = await pool.query('SELECT role FROM users WHERE id = ?', [requesterId]);
    if (requester.length === 0 || (requester[0].role !== 'admin' && requester[0].role !== 'elite' && requester[0].role !== 'creator')) {
      return res.status(403).json({ message: 'Only admin, elite, or creator can assign verified badges' });
    }

    // map human badge types to verified_tier/verified_badge fields
    const badgeMap = {
      blue: 'blue',
      gold: 'gold',
      purple: 'purple',
      sun: 'sun',
      moon: 'moon',
      star: 'star'
    }

    if (!badgeMap[badge]) {
      return res.status(400).json({ message: 'Invalid badge type' });
    }

    // if mapping to 'sun','moon','star', keep legacy verified_badge, else set verified_tier
    if (['sun','moon','star'].includes(badge)) {
      await pool.query('UPDATE users SET verified_badge = ?, is_verified = 1 WHERE id = ?', [badge, userId]);
    } else {
      await pool.query('UPDATE users SET verified_tier = ?, is_verified = 1 WHERE id = ?', [badge, userId]);
    }

    const [user] = await pool.query('SELECT id, email, username, display_name FROM users WHERE id = ?', [userId]);

    res.json({
      user: {
        id: user[0].id,
        email: user[0].email,
        username: user[0].username,
        displayName: user[0].display_name,
        verifiedBadge: badge,
        isVerified: true
      },
      message: 'Verified badge assigned successfully'
    });
  } catch (err) {
    console.error('Assign verified badge error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  const { identifier, email, phone, password } = req.body;
  const loginValue = String(identifier || email || phone || '').trim();

  if (!loginValue || !password) {
    return res.status(400).json({ message: 'Email/username/phone dan password wajib diisi' });
  }

  try {
    // The login form accepts one identifier. Match it against every supported
    // account field so usernames do not get mistaken for phone numbers.
    const normalizedIdentifier = loginValue.toLowerCase();
    const [users] = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? OR phone = ? LIMIT 1',
      [normalizedIdentifier, normalizedIdentifier, loginValue]
    );
    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    notifyLogin(user, req, 'password');

    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        emailConfirmed: user.email_confirmed,
        phoneConfirmed: user.phone_confirmed,
        verifiedBadge: computeVerifiedBadge(user),
        isVerified: user.is_verified,
        followersCount: user.followers_count,
        followingCount: user.following_count,
        postsCount: user.posts_count,
        likesReceived: user.likes_received_count,
        formattedFollowers: formatNumber(user.followers_count),
        formattedFollowing: formatNumber(user.following_count),
        formattedPosts: formatNumber(user.posts_count),
        formattedLikes: formatNumber(user.likes_received_count),
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const sendPhoneVerification = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const [users] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (users.length > 0) {
      await pool.query('UPDATE users SET phone_verification_code = ? WHERE id = ?', [verificationCode, users[0].id]);
    } else {
      await pool.query('INSERT INTO users (phone, phone_verification_code) VALUES (?, ?)', [phone, verificationCode]);
    }

    res.json({ message: 'Verification code sent', code: verificationCode });
  } catch (err) {
    console.error('Send phone verification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyPhone = async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ message: 'Phone and code are required' });
  }

  try {
    const [users] = await pool.query('SELECT id, phone_verification_code FROM users WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (users[0].phone_verification_code !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    await pool.query('UPDATE users SET phone_confirmed = 1, phone_verification_code = NULL WHERE id = ?', [users[0].id]);
    res.json({ message: 'Phone verified successfully' });
  } catch (err) {
    console.error('Verify phone error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const acceptTerms = async (req, res) => {
  try {
    const userId = req.userId;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    await pool.query(
      'INSERT INTO terms_acceptances (user_id, ip_address, user_agent) VALUES (?, ?, ?)',
      [userId, ip, userAgent]
    );

    res.json({ message: 'Terms accepted successfully' });
  } catch (err) {
    console.error('Accept terms error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const confirmEmail = async (req, res) => {
  // Accepts both GET /confirm/:token (email link) and POST /confirm-email { token }
  const token = req.params.token || req.body?.token;

  if (!token) {
    return res.status(400).json({ message: 'Token konfirmasi wajib diisi' });
  }

  try {
    const [users] = await pool.query('SELECT id FROM users WHERE confirmation_token = ? AND email_confirmed = 0', [token]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired confirmation token' });
    }

    await pool.query('UPDATE users SET email_confirmed = 1, confirmation_token = NULL WHERE id = ?', [users[0].id]);

    res.json({ message: 'Email confirmed successfully' });
  } catch (err) {
    console.error('Email confirmation error:', err);
    res.status(500).json({ message: 'Server error during email confirmation' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, phone, username, display_name, avatar_url, bio, email_confirmed, phone_confirmed, followers_count, following_count, posts_count, likes_received_count, verified_badge, is_verified, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        emailConfirmed: user.email_confirmed,
        phoneConfirmed: user.phone_confirmed,
        verifiedBadge: computeVerifiedBadge(user),
        isVerified: user.is_verified,
        followersCount: user.followers_count,
        followingCount: user.following_count,
        postsCount: user.posts_count,
        likesReceived: user.likes_received_count,
        formattedFollowers: formatNumber(user.followers_count),
        formattedFollowing: formatNumber(user.following_count),
        formattedPosts: formatNumber(user.posts_count),
        formattedLikes: formatNumber(user.likes_received_count),
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  const { displayName, bio } = req.body;
  const userId = req.userId;

  try {
    await pool.query(
      'UPDATE users SET display_name = ?, bio = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [displayName, bio, userId]
    );

    const [rows] = await pool.query(
      'SELECT id, email, username, display_name, avatar_url, bio, followers_count, following_count, posts_count, likes_received_count, verified_badge, is_verified FROM users WHERE id = ?',
      [userId]
    );
    const user = rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        verifiedBadge: computeVerifiedBadge(user),
        isVerified: user.is_verified,
        followersCount: user.followers_count,
        followingCount: user.following_count,
        postsCount: user.posts_count,
        likesReceived: user.likes_received_count,
        formattedFollowers: formatNumber(user.followers_count),
        formattedFollowing: formatNumber(user.following_count),
        formattedPosts: formatNumber(user.posts_count),
        formattedLikes: formatNumber(user.likes_received_count),
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.json({ message: 'If an account exists, a password reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000);

    await pool.query('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', [resetToken, resetExpires, users[0].id]);

    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'If an account exists, a password reset link has been sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const [users] = await pool.query('SELECT id FROM users WHERE reset_token = ? AND reset_expires > CURRENT_TIMESTAMP', [token]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', [passwordHash, users[0].id]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, oauthLogin, confirmEmail, getCurrentUser, updateProfile, forgotPassword, resetPassword, sendPhoneVerification, verifyPhone, acceptTerms, assignVerifiedBadge, computeVerifiedBadge, formatNumber };
