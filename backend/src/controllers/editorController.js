const { pool } = require('../models/db');

const trimVideo = async (req, res) => {
  try {
    const { mediaUrl, startTime, endTime } = req.body;

    if (!mediaUrl || startTime === undefined || endTime === undefined) {
      return res.status(400).json({ message: 'mediaUrl, startTime, and endTime are required' });
    }

    res.json({
      message: 'Video trim queued (stubbed)',
      mediaUrl,
      startTime,
      endTime,
      duration: endTime - startTime
    });
  } catch (err) {
    console.error('Trim video error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const changeSpeed = async (req, res) => {
  try {
    const { mediaUrl, speedFactor } = req.body;

    if (!mediaUrl || speedFactor === undefined) {
      return res.status(400).json({ message: 'mediaUrl and speedFactor are required' });
    }

    res.json({
      message: 'Speed change queued (stubbed)',
      mediaUrl,
      speedFactor,
      direction: speedFactor > 1 ? 'fast' : 'slow'
    });
  } catch (err) {
    console.error('Change speed error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const addTransition = async (req, res) => {
  try {
    const { mediaUrl, transitionType } = req.body;

    if (!mediaUrl || !transitionType) {
      return res.status(400).json({ message: 'mediaUrl and transitionType are required' });
    }

    res.json({
      message: 'Transition added (stubbed)',
      mediaUrl,
      transitionType
    });
  } catch (err) {
    console.error('Add transition error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { trimVideo, changeSpeed, addTransition };
