const express = require('express');
const multer = require('multer');
const Image = require('../models/Image');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Multer memory storage — file kept in buffer, not written to disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /api/uploads/image — upload an image to MongoDB
router.post('/image', verifyToken, (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    try {
      const base64Data = req.file.buffer.toString('base64');

      const image = new Image({
        userId: req.userId,
        data: base64Data,
        contentType: req.file.mimetype,
        filename: req.file.originalname,
      });

      await image.save();

      res.status(201).json({
        imageId: image._id,
        url: `/api/uploads/image/${image._id}`,
      });
    } catch (error) {
      next(error);
    }
  });
});

// GET /api/uploads/image/:imageId — serve an image from MongoDB
router.get('/image/:imageId', async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const buffer = Buffer.from(image.data, 'base64');
    res.set('Content-Type', image.contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
