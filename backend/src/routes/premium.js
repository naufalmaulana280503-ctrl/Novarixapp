const express = require('express');
const router = express.Router();
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { premiumGate } = require('../middleware/premiumGate');
const { v4: uuidv4 } = require('uuid');

// Mock payment processor function — replace with real gateway integration (Stripe, PayPal, etc.)
const processPayment = async ({ amountUsd, paymentToken }) => {
  // In production, call payment gateway SDK here. For now, simulate success.
  return {
    success: true,
    transactionId: `txn_${uuidv4().split('-')[0]}`,
    amountUsd,
    provider: 'mock'
  };
};

// Subscribe endpoint: charges and creates/extends subscription
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { plan = 'monthly', paymentToken } = req.body;

    const planMap = {
      monthly: { days: 30, amount: 9.99 },
      yearly: { days: 365, amount: 99.99 }
    };

    if (!planMap[plan]) return res.status(400).json({ message: 'Invalid plan' });

    const { days, amount } = planMap[plan];

    const payment = await processPayment({ amountUsd: amount, paymentToken });
    if (!payment.success) return res.status(402).json({ message: 'Payment failed' });

    // compute new expiry
    const [existing] = await pool.query('SELECT premium_expires, is_premium FROM users WHERE id = ?', [userId]);
    let base = new Date();
    if (existing && existing.length > 0) {
      const row = existing[0];
      if (row.is_premium && row.premium_expires) {
        const ex = new Date(row.premium_expires);
        if (ex > base) base = ex; // extend from current expiry
      }
    }

    const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    // insert subscription record
    const metadata = JSON.stringify({ plan, provider: payment.provider });
    const [insertRes] = await pool.query(
      'INSERT INTO subscriptions (user_id, provider, plan, status, amount_usd, transaction_id, metadata, started_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)',
      [userId, payment.provider, plan, 'active', amount, payment.transactionId, metadata, newExpiry.toISOString()]
    );

    // update user premium flags, grant genesis badge and theme
    await pool.query('UPDATE users SET is_premium = 1, premium_expires = ?, theme = ?, genesis_badge = 1 WHERE id = ?', [newExpiry.toISOString(), 'obsidian-gold', userId]);

    res.json({ message: 'Subscription active', expires_at: newExpiry.toISOString(), transaction_id: payment.transactionId });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Simple gate endpoint to check before using a premium feature
router.post('/use-feature', authenticate, premiumGate, async (req, res) => {
  try {
    const { feature } = req.body;
    // Example: if feature === 'global_omnipresence' then enable the algorithm for this user session
    // For now return allowed
    res.json({ allowed: true, feature });
  } catch (err) {
    console.error('use-feature error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// check subscription status
router.get('/status/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [rows] = await pool.query('SELECT is_premium, premium_expires, theme, genesis_badge FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const u = rows[0];
    const now = new Date();
    const expires = u.premium_expires ? new Date(u.premium_expires) : null;
    const active = u.is_premium && expires && expires > now;
    res.json({ is_premium: !!u.is_premium, active: !!active, expires_at: u.premium_expires, theme: u.theme, genesis_badge: !!u.genesis_badge });
  } catch (err) {
    console.error('status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
