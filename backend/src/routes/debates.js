const express = require('express');
const router = express.Router();
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

// simple alias generator
const ALIAS_PREFIX = 'Debater_';
function generateAlias(debateId, count) {
  // map 1->Alpha,2->Beta,etc or fallback numbering
  const names = ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa'];
  return `${ALIAS_PREFIX}${names[(count-1) % names.length] || count}`;
}

// create a debate
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, reveal_at } = req.body;
    const userId = req.userId;

    const [result] = await pool.query('INSERT INTO debates (title, description, reveal_at, created_by) VALUES (?, ?, ?, ?)', [title || null, description || null, reveal_at || null, userId]);
    const debateId = result.insertId;
    res.status(201).json({ id: debateId, message: 'Debate created' });
  } catch (err) {
    console.error('Create debate error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// join a debate (anonymous alias assigned)
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const debateId = parseInt(req.params.id);
    const userId = req.userId;

    // count existing participants
    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM debate_participants WHERE debate_id = ?', [debateId]);
    const count = rows[0]?.cnt ? Number(rows[0].cnt) + 1 : 1;
    const alias = generateAlias(debateId, count);

    await pool.query('INSERT INTO debate_participants (debate_id, user_id, alias) VALUES (?, ?, ?)', [debateId, userId, alias]);

    res.json({ message: 'Joined debate', alias });
  } catch (err) {
    console.error('Join debate error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get debate info and participants (participants revealed only after reveal_at)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const debateId = parseInt(req.params.id);
    const [debateRows] = await pool.query('SELECT * FROM debates WHERE id = ?', [debateId]);
    if (!debateRows || debateRows.length === 0) return res.status(404).json({ message: 'Debate not found' });
    const debate = debateRows[0];

    const [participants] = await pool.query('SELECT dp.id, dp.alias, dp.user_id, dp.is_revealed FROM debate_participants dp WHERE dp.debate_id = ?', [debateId]);

    // determine reveal status by reveal_at
    const now = new Date();
    const revealAt = debate.reveal_at ? new Date(debate.reveal_at) : null;
    const autoReveal = revealAt && revealAt.getTime() <= now.getTime();

    if (autoReveal) {
      // return real user ids and mark revealed
      await pool.query('UPDATE debate_participants SET is_revealed = 1 WHERE debate_id = ?', [debateId]);
    }

    const [updatedParticipants] = await pool.query('SELECT dp.id, dp.alias, dp.user_id, dp.is_revealed FROM debate_participants dp WHERE dp.debate_id = ?', [debateId]);

    res.json({ debate, participants: updatedParticipants, revealed: autoReveal });
  } catch (err) {
    console.error('Get debate error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
