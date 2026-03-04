const express = require('express');
const Catch = require('../models/Catch');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Validate coordinates are in-range real numbers
function parseCoords(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

// Log a new catch
router.post('/log', verifyToken, async (req, res, next) => {
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
      weather,
      timeOfDay,
      catchTime,
      releaseInfo,
      notes,
      visibility,
      images,
    } = req.body;

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
      waterConditions,
      weather,
      timeOfDay,
      catchTime: catchTime || new Date(),
      releaseInfo,
      images,
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

// Add comment
router.post('/:catchId/comment', verifyToken, async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || String(text).trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const trimmedText = String(text).trim().slice(0, 500);

    const catchDoc = await Catch.findByIdAndUpdate(
      req.params.catchId,
      {
        $push: {
          comments: {
            userId: req.userId,
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
