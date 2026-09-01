const { pool } = require('../models/db');

const capturePhoto = async (req, res) => {
  try {
    const userId = req.userId;
    const { imageData, metadata } = req.body;

    if (!imageData) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    res.status(201).json({
      message: 'Photo captured successfully',
      imageData: imageData.substring(0, 100) + '...',
      metadata: metadata || {}
    });
  } catch (err) {
    console.error('Capture photo error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const startVideoRecording = async (req, res) => {
  try {
    const userId = req.userId;
    const { resolution, fps, isSlowMotion } = req.body;

    const sessionId = `rec_${Date.now()}_${userId}`;

    res.status(201).json({
      sessionId,
      message: 'Recording started',
      resolution: resolution || '1080x1920',
      fps: fps || 30,
      isSlowMotion: !!isSlowMotion
    });
  } catch (err) {
    console.error('Start video recording error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const stopVideoRecording = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    res.json({
      sessionId,
      message: 'Recording stopped',
      userId,
      stoppedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Stop video recording error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const applyBeautyEffect = async (req, res) => {
  try {
    const { imageData, effectType } = req.body;

    if (!imageData || !effectType) {
      return res.status(400).json({ message: 'Image data and effect type are required' });
    }

    res.json({
      imageData: imageData.substring(0, 100) + '...',
      effectType,
      applied: true,
      message: 'Beauty effect applied (stubbed)'
    });
  } catch (err) {
    console.error('Apply beauty effect error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { capturePhoto, startVideoRecording, stopVideoRecording, applyBeautyEffect };
