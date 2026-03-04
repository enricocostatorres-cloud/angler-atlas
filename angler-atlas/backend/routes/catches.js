const express = require('express');
const multer = require('multer');
const path = require('path');
const Catch = require('../models/Catch');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Multer storage config for catch photos
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, `catch-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(ext && mime ? null : new Error('Only image files are allowed'), ext && mime);
  },
});

// Validate coordinates are in-range real numbers
function parseCoords(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

// Log a new catch (accepts JSON or multipart/form-data with photo)
router.post('/log', verifyToken, upload.single('photo'), async (req, res, next) => {
  try {
    const {
      species,
      weight,
      length,
      depth,
      latitude,
      longitude,
      address,
      lureUsed,
      waterConditions,
      waterTemperature,
      weather,
      timeOfDay,
      catchTime,
      notes,
      visibility,
      images,
      wasReleased,
    } = req.body;

    // Support releaseInfo from JSON or wasReleased from FormData
    let releaseInfo = req.body.releaseInfo;
    if (!releaseInfo && wasReleased === 'true') {
      releaseInfo = { wasReleased: true };
    }

    // Support waterConditions from JSON or waterTemperature from FormData
    let waterCond = waterConditions;
    if (!waterCond && waterTemperature) {
      waterCond = { temperature: parseFloat(waterTemperature) };
    }

    if (!species || !latitude || !longitude) {
      return res.status(400).json({ error: 'Species and location are required' });
    }

    const trimmedSpecies = String(species).trim();
    if (trimmedSpecies.length === 0 || trimmedSpecies.length > 100) {
      return res.status(400).json({ error: 'Species name must be between 1 and 100 characters' });
    }

    const coords = parseCoords(latitude, longitude);
    if (!coords) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    if (weight !== undefined && weight !== null && (isNaN(weight) || Number(weight) < 0)) {
      return res.status(400).json({ error: 'Weight must be a non-negative number' });
    }
    if (length !== undefined && length !== null && (isNaN(length) || Number(length) < 0)) {
      return res.status(400).json({ error: 'Length must be a non-negative number' });
    }
    if (depth !== undefined && depth !== null && (isNaN(depth) || Number(depth) < 0)) {
      return res.status(400).json({ error: 'Depth must be a non-negative number' });
    }

    // Build images array — uploaded photo path + any existing URLs
    const imageList = [];
    if (req.file) {
      imageList.push(`/uploads/${req.file.filename}`);
    }
    if (images) {
      const extra = Array.isArray(images) ? images : [images];
      imageList.push(...extra);
    }

    const newCatch = new Catch({
      userId: req.userId,
      species: trimmedSpecies,
      weight: weight || undefined,
      length: length || undefined,
      depth: depth || undefined,
      location: {
        type: 'Point',
        coordinates: [coords.lng, coords.lat],
        address: address ? String(address).trim().slice(0, 200) : undefined,
      },
      lureUsed: lureUsed ? String(lureUsed).trim().slice(0, 100) : undefined,
      waterConditions: waterCond,
      weather,
      timeOfDay,
      catchTime: catchTime || new Date(),
      releaseInfo,
      images: imageList.length > 0 ? imageList : undefined,
      notes: notes ? String(notes).trim().slice(0, 1000) : undefined,
      visibility: visibility || 'public',
    });

    await newCatch.save();
    await newCatch.populate('userId', 'username profilePicture');

    res.status(201).json({
      message: 'Catch logged successfully',
      catch: newCatch,
    });
  } catch (error) {
    next(error);
  }
});

// Get all catches for feed (public)
router.get('/feed', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const catches = await Catch.find({ visibility: 'public' })
      .populate('userId', 'username profilePicture rank')
      .populate('comments.userId', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Catch.countDocuments({ visibility: 'public' });

    res.json({
      catches,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get catches near location (for map)
router.get('/nearby', async (req, res, next) => {
  try {
    const { longitude, latitude, maxDistance } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ error: 'Longitude and latitude are required' });
    }

    const coords = parseCoords(latitude, longitude);
    if (!coords) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const distance = Math.min(parseInt(maxDistance) || 5000, 50000); // cap at 50km

    const catches = await Catch.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [coords.lng, coords.lat],
          },
          $maxDistance: distance,
        },
      },
      visibility: 'public',
    })
      .populate('userId', 'username profilePicture')
      .limit(50);

    res.json(catches);
  } catch (error) {
    next(error);
  }
});

// Get user's catches
router.get('/user/:userId', async (req, res, next) => {
  try {
    const catches = await Catch.find({ userId: req.params.userId, visibility: { $in: ['public', 'friends'] } })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 });

    res.json(catches);
  } catch (error) {
    next(error);
  }
});

// Like a catch
router.post('/:catchId/like', verifyToken, async (req, res, next) => {
  try {
    const catchDoc = await Catch.findById(req.params.catchId);

    if (!catchDoc) {
      return res.status(404).json({ error: 'Catch not found' });
    }

    const likeIndex = catchDoc.likes.indexOf(req.userId);

    if (likeIndex > -1) {
      catchDoc.likes.splice(likeIndex, 1);
    } else {
      catchDoc.likes.push(req.userId);
    }

    await catchDoc.save();
    res.json({ likes: catchDoc.likes.length, liked: likeIndex === -1 });
  } catch (error) {
    next(error);
  }
});

// Add comment (saves denormalized username for quick display)
router.post('/:catchId/comment', verifyToken, async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || String(text).trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const trimmedText = String(text).trim().slice(0, 500);

    // Look up username for denormalized storage
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('username');

    const catchDoc = await Catch.findByIdAndUpdate(
      req.params.catchId,
      {
        $push: {
          comments: {
            userId: req.userId,
            username: user ? user.username : 'Angler',
            text: trimmedText,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate('comments.userId', 'username profilePicture');

    if (!catchDoc) {
      return res.status(404).json({ error: 'Catch not found' });
    }

    res.json(catchDoc.comments);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
