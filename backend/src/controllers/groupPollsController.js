const { pool } = require('../models/db');

const createPoll = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const creatorId = req.userId;
    const { question, options, expiresAt } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Question and at least 2 options are required' });
    }

    const [groups] = await pool.query('SELECT id FROM groups WHERE id = ?', [groupId]);
    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const [members] = await pool.query('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, creatorId]);
    if (members.length === 0 || (members[0].role !== 'owner' && members[0].role !== 'admin')) {
      return res.status(403).json({ message: 'Only owner or admin can create polls' });
    }

    const optionsJson = JSON.stringify(options);

    const [result] = await pool.query(
      'INSERT INTO group_polls (group_id, creator_id, question, options, expires_at) VALUES (?, ?, ?, ?, ?)',
      [groupId, creatorId, question, optionsJson, expiresAt || null]
    );

    const [rows] = await pool.query('SELECT * FROM group_polls WHERE id = ?', [result.insertId]);
    const poll = rows[0];

    res.status(201).json({
      id: poll.id,
      groupId: poll.group_id,
      creatorId: poll.creator_id,
      question: poll.question,
      options: JSON.parse(poll.options),
      expiresAt: poll.expires_at,
      createdAt: poll.created_at
    });
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const votePoll = async (req, res) => {
  try {
    const pollId = parseInt(req.params.pollId);
    const userId = req.userId;
    const { optionIndex } = req.body;

    const [polls] = await pool.query('SELECT * FROM group_polls WHERE id = ?', [pollId]);
    if (polls.length === 0) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    const poll = polls[0];
    const [members] = await pool.query('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [poll.group_id, userId]);
    if (members.length === 0) return res.status(403).json({ message: 'Not a member of this group' });

    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Poll has expired' });
    }

    const options = JSON.parse(poll.options);
    if (optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ message: 'Invalid option index' });
    }

    const [existing] = await pool.query('SELECT id FROM group_poll_votes WHERE poll_id = ? AND user_id = ?', [pollId, userId]);
    if (existing.length > 0) {
      await pool.query('UPDATE group_poll_votes SET option_index = ? WHERE id = ?', [optionIndex, existing[0].id]);
    } else {
      await pool.query('INSERT INTO group_poll_votes (poll_id, user_id, option_index) VALUES (?, ?, ?)', [pollId, userId, optionIndex]);
    }

    res.json({ message: 'Vote recorded' });
  } catch (err) {
    console.error('Vote poll error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPollResults = async (req, res) => {
  try {
    const pollId = parseInt(req.params.pollId);

    const [polls] = await pool.query('SELECT * FROM group_polls WHERE id = ?', [pollId]);
    if (polls.length === 0) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    const poll = polls[0];
    const [members] = await pool.query('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [poll.group_id, req.userId]);
    if (members.length === 0) return res.status(403).json({ message: 'Not a member of this group' });

    const options = JSON.parse(poll.options);
    const voteCounts = new Array(options.length).fill(0);

    const [votes] = await pool.query('SELECT option_index, COUNT(*) as count FROM group_poll_votes WHERE poll_id = ? GROUP BY option_index', [pollId]);
    votes.forEach(v => {
      voteCounts[v.option_index] = parseInt(v.count);
    });

    const totalVotes = voteCounts.reduce((a, b) => a + b, 0);

    res.json({
      pollId: poll.id,
      question: poll.question,
      options: options.map((opt, i) => ({
        text: opt,
        votes: voteCounts[i],
        percentage: totalVotes > 0 ? Math.round((voteCounts[i] / totalVotes) * 100) : 0
      })),
      totalVotes,
      expiresAt: poll.expires_at
    });
  } catch (err) {
    console.error('Get poll results error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createPoll, votePoll, getPollResults };
