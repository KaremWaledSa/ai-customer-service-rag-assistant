const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { query } = require('../config/database');
const { analyzeImage } = require('../services/vision.service');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF allowed.'));
    }
  }
});

// Protect all routes
router.use(authMiddleware);

/**
 * POST /api/images/analyze
 * Upload and analyze an image
 */
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { message_id, force_type } = req.body;

    // Read the uploaded file
    const imageBuffer = await fs.readFile(req.file.path);

    // Analyze the image
    const result = await analyzeImage(imageBuffer, force_type);

    // Save to database if linked to a message
    if (message_id) {
      await query(`
        INSERT INTO images (message_id, file_path, original_filename, mime_type, file_size, image_type, analysis_result, extracted_text, status, processed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', NOW())
        RETURNING id
      `, [
        message_id,
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        result.image_type,
        JSON.stringify(result.analysis),
        result.analysis.text || result.analysis.extracted_text || null
      ]);
    }

    res.json({
      image_type: result.image_type,
      analysis: result.analysis,
      file_path: req.file.path,
      analyzed_at: result.analyzed_at
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkErr) {
        console.error('Failed to delete file:', unlinkErr);
      }
    }
    res.status(500).json({ error: 'Image analysis failed' });
  }
});

/**
 * POST /api/images/analyze-base64
 * Analyze a base64 encoded image (no file upload)
 */
router.post('/analyze-base64', async (req, res) => {
  try {
    const { image_data, force_type, message_id } = req.body;

    if (!image_data) {
      return res.status(400).json({ error: 'image_data (base64) required' });
    }

    // Remove data URL prefix if present
    const base64Data = image_data.replace(/^data:image\/\w+;base64,/, '');

    // Analyze the image
    const result = await analyzeImage(base64Data, force_type);

    // Save to database if linked to a message
    if (message_id) {
      await query(`
        INSERT INTO images (message_id, image_type, analysis_result, extracted_text, status, processed_at)
        VALUES ($1, $2, $3, $4, 'completed', NOW())
        RETURNING id
      `, [
        message_id,
        result.image_type,
        JSON.stringify(result.analysis),
        result.analysis.text || result.analysis.extracted_text || null
      ]);
    }

    res.json({
      image_type: result.image_type,
      analysis: result.analysis,
      analyzed_at: result.analyzed_at
    });
  } catch (error) {
    console.error('Base64 analysis error:', error);
    res.status(500).json({ error: 'Image analysis failed' });
  }
});

/**
 * GET /api/images/:id
 * Get image analysis result
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM images WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = result.rows[0];

    // Parse analysis_result if it's a string
    if (image.analysis_result && typeof image.analysis_result === 'string') {
      image.analysis_result = JSON.parse(image.analysis_result);
    }

    res.json({ image });
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({ error: 'Failed to get image' });
  }
});

/**
 * GET /api/images/message/:messageId
 * Get all images for a message
 */
router.get('/message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await query(
      'SELECT * FROM images WHERE message_id = $1 ORDER BY created_at',
      [messageId]
    );

    res.json({ images: result.rows });
  } catch (error) {
    console.error('Get message images error:', error);
    res.status(500).json({ error: 'Failed to get images' });
  }
});

module.exports = router;
