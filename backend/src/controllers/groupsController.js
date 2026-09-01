const { pool } = require('../models/db');

const createGroup = async (req, res) => {
  try {
    const { name, description, isPrivate, avatarUrl, admins } = req.body;
    const ownerId = req.userId;

    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const [owners] = await pool.query('SELECT id FROM users WHERE id = ?', [ownerId]);
    if (!owners.length) {
      return res.status(401).json({ message: 'Akun login tidak tersedia di database Supabase. Silakan daftar atau login ulang.' });
    }

    const maxMembers = 3500000;
    const [result] = await pool.query(
      'INSERT INTO groups (name, description, avatar_url, owner_id, is_private, max_members) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), description || null, avatarUrl || null, ownerId, isPrivate ? 1 : 0, maxMembers]
    );

    const groupId = result.insertId;
    await pool.query('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)', [groupId, ownerId, 'owner']);

    const adminIds = Array.isArray(admins)
      ? [...new Set(admins.map(Number).filter(id => Number.isInteger(id) && id !== ownerId))]
      : [];
    for (const adminId of adminIds) {
      const [adminUsers] = await pool.query('SELECT id FROM users WHERE id = ?', [adminId]);
      if (adminUsers.length === 0) continue;
      await pool.query('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)', [groupId, adminId, 'admin']);
    }

    const [group] = await pool.query('SELECT * FROM groups WHERE id = ?', [groupId]);

    res.status(201).json({
      id: group[0].id,
      name: group[0].name,
      description: group[0].description,
      avatarUrl: group[0].avatar_url,
      ownerId: group[0].owner_id,
      isPrivate: !!group[0].is_private,
      inviteCode: group[0].invite_code,
      maxMembers: group[0].max_members,
      createdAt: group[0].created_at
    });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getGroup = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const [rows] = await pool.query(
      `SELECT g.*, u.username as owner_username, u.avatar_url as owner_avatar_url
       FROM groups g
       JOIN users u ON g.owner_id = u.id
       WHERE g.id = ?`,
      [groupId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const group = rows[0];

    res.json({
      id: group.id,
      name: group.name,
      description: group.description,
      avatarUrl: group.avatar_url,
      ownerId: group.owner_id,
      ownerUsername: group.owner_username,
      ownerAvatarUrl: group.owner_avatar_url,
      isPrivate: !!group.is_private,
      inviteCode: group.invite_code,
      maxMembers: group.max_members,
      createdAt: group.created_at,
      updatedAt: group.updated_at
    });
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateGroup = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const requesterId = req.userId;
    const { name, description, avatarUrl } = req.body;

    const [groups] = await pool.query('SELECT owner_id FROM groups WHERE id = ?', [groupId]);
    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (groups[0].owner_id !== requesterId) {
      return res.status(403).json({ message: 'Only group owner can update group' });
    }

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (avatarUrl !== undefined) { updates.push('avatar_url = ?'); params.push(avatarUrl); }
    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 1) {
      return res.json({ message: 'No changes provided' });
    }

    params.push(groupId);
    await pool.query(`UPDATE groups SET ${updates.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.query('SELECT * FROM groups WHERE id = ?', [groupId]);
    const group = rows[0];

    res.json({
      id: group.id,
      name: group.name,
      description: group.description,
      avatarUrl: group.avatar_url,
      updatedAt: group.updated_at
    });
  } catch (err) {
    console.error('Update group error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const requesterId = req.userId;

    const [groups] = await pool.query('SELECT owner_id FROM groups WHERE id = ?', [groupId]);
    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (groups[0].owner_id !== requesterId) {
      return res.status(403).json({ message: 'Only group owner can delete group' });
    }

    await pool.query('DELETE FROM groups WHERE id = ?', [groupId]);
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const listUserGroups = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [rows] = await pool.query(
            `SELECT g.*, gm.role, gm.joined_at,
              (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) AS member_count,
              (SELECT m.text FROM messages m WHERE m.group_id = g.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT m.created_at FROM messages m WHERE m.group_id = g.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY gm.joined_at DESC`,
      [userId]
    );

    res.json({
      groups: rows.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        avatarUrl: g.avatar_url,
        ownerId: g.owner_id,
        isPrivate: !!g.is_private,
        inviteCode: null,
        maxMembers: g.max_members,
        role: g.role,
        joinedAt: g.joined_at,
        createdAt: g.created_at
      }))
    });
  } catch (err) {
    console.error('List user groups error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// List groups for authenticated user (GET /api/groups)
const listMyGroups = async (req, res) => {
  try {
    const userId = req.userId;
    const [rows] = await pool.query(
            `SELECT g.*, gm.role, gm.joined_at,
              (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) AS member_count,
              (SELECT m.text FROM messages m WHERE m.group_id = g.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT m.created_at FROM messages m WHERE m.group_id = g.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY gm.joined_at DESC`,
      [userId]
    );

    res.json({
      groups: rows.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        avatarUrl: g.avatar_url,
        ownerId: g.owner_id,
        isPrivate: !!g.is_private,
        inviteCode: g.invite_code,
        maxMembers: g.max_members,
        role: g.role,
        joinedAt: g.joined_at,
        createdAt: g.created_at,
        memberCount: Number(g.member_count) || 0,
        lastMessage: g.last_message || null,
        lastMessageAt: g.last_message_at || null,
        unreadCount: 0
      }))
    });
  } catch (err) {
    console.error('List my groups error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const joinGroup = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = req.userId;

    const [groups] = await pool.query('SELECT id, max_members, is_private FROM groups WHERE id = ?', [groupId]);
    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const group = groups[0];

    const [members] = await pool.query('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?', [groupId]);
    if (members[0].count >= group.max_members) {
      return res.status(400).json({ message: 'Group is full' });
    }

    if (group.is_private) {
      return res.status(403).json({ message: 'Group is private. Use invite code to join.' });
    }

    try {
      await pool.query('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)', [groupId, userId, 'member']);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ message: 'Already a member' });
      }
      throw err;
    }

    res.json({ message: 'Joined group successfully' });
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = req.userId;

    const [groups] = await pool.query('SELECT owner_id FROM groups WHERE id = ?', [groupId]);
    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (groups[0].owner_id === userId) {
      return res.status(400).json({ message: 'Group owner cannot leave. Transfer ownership or delete group.' });
    }

    await pool.query('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
    res.json({ message: 'Left group successfully' });
  } catch (err) {
    console.error('Leave group error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getGroupMembers = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const [access] = await pool.query('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.userId]);
    if (access.length === 0) return res.status(403).json({ message: 'Not a member of this group' });
    const [rows] = await pool.query(
      `SELECT gm.*, u.username, u.display_name, u.avatar_url
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY CASE gm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END, gm.joined_at ASC`,
      [groupId]
    );

    res.json({
      members: rows.map(m => ({
        id: m.id,
        groupId: m.group_id,
        userId: m.user_id,
        username: m.username,
        displayName: m.display_name,
        avatarUrl: m.avatar_url,
        role: m.role,
        joinedAt: m.joined_at
      }))
    });
  } catch (err) {
    console.error('Get group members error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const addMember = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    const userId = parseInt(req.body.userId, 10);
    const [requesters] = await pool.query('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.userId]);
    if (!requesters.length || !['owner', 'admin'].includes(requesters[0].role)) return res.status(403).json({ message: 'Hanya owner/admin yang dapat menambahkan anggota' });
    const [groups] = await pool.query('SELECT max_members FROM groups WHERE id = ?', [groupId]);
    if (!groups.length) return res.status(404).json({ message: 'Group not found' });
    const [count] = await pool.query('SELECT COUNT(*) AS count FROM group_members WHERE group_id = ?', [groupId]);
    if (Number(count[0].count) >= Number(groups[0].max_members)) return res.status(400).json({ message: 'Group is full' });
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ message: 'User not found' });
    try {
      await pool.query('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)', [groupId, userId, 'member']);
    } catch (err) {
      if (/unique|duplicate/i.test(err.message)) return res.status(409).json({ message: 'User is already a member' });
      throw err;
    }
    res.status(201).json({ message: 'Member added successfully', userId });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const kickMember = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const requesterId = req.userId;
    const userIdToKick = parseInt(req.params.userId);

    const [groups] = await pool.query('SELECT owner_id FROM groups WHERE id = ?', [groupId]);
    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const [members] = await pool.query('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, requesterId]);
    if (members.length === 0) {
      return res.status(403).json({ message: 'Not a member' });
    }

    const isOwner = groups[0].owner_id === requesterId;
    const isAdmin = members[0].role === 'admin' || members[0].role === 'owner';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only owner or admin can kick members' });
    }

    if (groups[0].owner_id === userIdToKick) {
      return res.status(400).json({ message: 'Cannot kick group owner' });
    }

    const [target] = await pool.query('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userIdToKick]);
    if (!target.length) return res.status(404).json({ message: 'Member not found' });
    if (!isOwner && target[0].role === 'admin') return res.status(403).json({ message: 'Only owner can kick an admin' });

    await pool.query('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userIdToKick]);
    res.json({ message: 'Member kicked successfully' });
  } catch (err) {
    console.error('Kick member error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const changeMemberRole = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const requesterId = req.userId;
    const userId = parseInt(req.params.userId);
    const { newRole } = req.body;

    const validRoles = ['owner', 'admin', 'member'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const [groups] = await pool.query('SELECT owner_id FROM groups WHERE id = ?', [groupId]);
    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (groups[0].owner_id !== requesterId) {
      return res.status(403).json({ message: 'Only group owner can change roles' });
    }

    await pool.query('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?', [newRole, groupId, userId]);
    res.json({ message: 'Member role updated' });
  } catch (err) {
    console.error('Change member role error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const generateInviteCode = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const ownerId = req.userId;

    const [groups] = await pool.query('SELECT owner_id FROM groups WHERE id = ?', [groupId]);
    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (groups[0].owner_id !== ownerId) {
      return res.status(403).json({ message: 'Only group owner can generate invite code' });
    }

    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    await pool.query('UPDATE groups SET invite_code = ? WHERE id = ?', [inviteCode, groupId]);

    const [rows] = await pool.query('SELECT invite_code FROM groups WHERE id = ?', [groupId]);
    res.json({ inviteCode: rows[0].invite_code });
  } catch (err) {
    console.error('Generate invite code error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const joinByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.userId;

    const [groups] = await pool.query('SELECT id, max_members FROM groups WHERE invite_code = ?', [inviteCode]);
    if (groups.length === 0) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }
    const group = groups[0];

    const [members] = await pool.query('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?', [group.id]);
    if (members[0].count >= group.max_members) {
      return res.status(400).json({ message: 'Group is full' });
    }

    try {
      await pool.query('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)', [group.id, userId, 'member']);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ message: 'Already a member' });
      }
      throw err;
    }

    res.json({ message: 'Joined group via invite code', groupId: group.id });
  } catch (err) {
    console.error('Join by invite code error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createGroup, getGroup, updateGroup, deleteGroup, listUserGroups, listMyGroups,
  joinGroup, leaveGroup, getGroupMembers, addMember, kickMember, changeMemberRole,
  generateInviteCode, joinByInviteCode
};
