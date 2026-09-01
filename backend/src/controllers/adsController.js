const { pool } = require('../models/db');

const checkEligibility = async (req, res) => {
  try {
    const creatorId = req.userId;
    const [users] = await pool.query('SELECT followers_count, likes_received_count, role FROM users WHERE id = ?', [creatorId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { followers_count, likes_received_count, role } = users[0];
    const isEligible = followers_count >= 70000000 && likes_received_count >= 35000000000000 && (role === 'creator' || role === 'elite');

    res.json({
      isEligible,
      followersCount: followers_count,
      likesReceived: likes_received_count,
      requiredFollowers: 70000000,
      requiredLikes: 35000000000000,
      feeUsd: 1000,
      message: isEligible ? 'You are eligible for Creator Ads' : 'You need 70M followers and 35T likes to be eligible'
    });
  } catch (err) {
    console.error('Check eligibility error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createAd = async (req, res) => {
  try {
    const creatorId = req.userId;
    const { title, description, mediaUrl, targetDate, feeUsd } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [creatorId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (users[0].role !== 'creator' && users[0].role !== 'admin') {
      return res.status(403).json({ message: 'Only creators can create ads' });
    }

    const [result] = await pool.query(
      'INSERT INTO ads (creator_id, title, description, media_url, target_date, fee_usd) VALUES (?, ?, ?, ?, ?, ?)',
      [creatorId, title, description || null, mediaUrl || null, targetDate, feeUsd || 1000]
    );

    const [rows] = await pool.query('SELECT * FROM ads WHERE id = ?', [result.insertId]);
    const ad = rows[0];

    res.status(201).json({
      id: ad.id,
      creatorId: ad.creator_id,
      title: ad.title,
      description: ad.description,
      mediaUrl: ad.media_url,
      targetDate: ad.target_date,
      status: ad.status,
      feeUsd: ad.fee_usd,
      impressionsTarget: ad.impressions_target,
      impressionsDelivered: ad.impressions_delivered,
      createdAt: ad.created_at
    });
  } catch (err) {
    console.error('Create ad error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyAds = async (req, res) => {
  try {
    const creatorId = req.userId;
    const [rows] = await pool.query(
      'SELECT * FROM ads WHERE creator_id = ? ORDER BY created_at DESC',
      [creatorId]
    );

    res.json({
      ads: rows.map(a => ({
        id: a.id,
        creatorId: a.creator_id,
        title: a.title,
        description: a.description,
        mediaUrl: a.media_url,
        targetDate: a.target_date,
        status: a.status,
        feeUsd: a.fee_usd,
        impressionsTarget: a.impressions_target,
        impressionsDelivered: a.impressions_delivered,
        createdAt: a.created_at
      }))
    });
  } catch (err) {
    console.error('Get my ads error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAdStats = async (req, res) => {
  try {
    const adId = parseInt(req.params.adId);
    const creatorId = req.userId;

    const [ads] = await pool.query('SELECT * FROM ads WHERE id = ? AND creator_id = ?', [adId, creatorId]);
    if (ads.length === 0) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    const ad = ads[0];

    res.json({
      adId: ad.id,
      title: ad.title,
      status: ad.status,
      impressionsTarget: ad.impressions_target,
      impressionsDelivered: ad.impressions_delivered,
      completionPercentage: ad.impressions_target > 0 ? Math.round((ad.impressions_delivered / ad.impressions_target) * 100) : 0,
      createdAt: ad.created_at
    });
  } catch (err) {
    console.error('Get ad stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const approveAd = async (req, res) => {
  try {
    const adId = parseInt(req.params.adId);
    const moderatorId = req.userId;

    const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [moderatorId]);
    if (users.length === 0 || (users[0].role !== 'admin' && users[0].role !== 'moderator')) {
      return res.status(403).json({ message: 'Only admin or moderator can approve ads' });
    }

    const [ads] = await pool.query('SELECT * FROM ads WHERE id = ?', [adId]);
    if (ads.length === 0) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    await pool.query("UPDATE ads SET status = 'approved' WHERE id = ?", [adId]);
    res.json({ message: 'Ad approved successfully' });
  } catch (err) {
    console.error('Approve ad error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const rejectAd = async (req, res) => {
  try {
    const adId = parseInt(req.params.adId);
    const moderatorId = req.userId;
    const { reason } = req.body;

    const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [moderatorId]);
    if (users.length === 0 || (users[0].role !== 'admin' && users[0].role !== 'moderator')) {
      return res.status(403).json({ message: 'Only admin or moderator can reject ads' });
    }

    const [ads] = await pool.query('SELECT * FROM ads WHERE id = ?', [adId]);
    if (ads.length === 0) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    await pool.query("UPDATE ads SET status = 'rejected', description = ? WHERE id = ?", [reason || ads[0].description, adId]);
    res.json({ message: 'Ad rejected successfully' });
  } catch (err) {
    console.error('Reject ad error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { checkEligibility, createAd, getMyAds, getAdStats, approveAd, rejectAd };
