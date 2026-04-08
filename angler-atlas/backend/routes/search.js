const express = require('express');
const User = require('../models/User');
const Catch = require('../models/Catch');

const router = express.Router();

// GET /api/search?q=QUERY
router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 1) {
      return res.json({ users: [], catches: [] });
    }

    // Escape special regex characters to prevent ReDoS
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const [users, catches] = await Promise.all([
      User.find({ username: regex })
        .select('username profilePicture rank points')
        .limit(10),
      Catch.find({ species: regex, visibility: 'public' })
        .populate('userId', 'username')
        .select('species weight location userId')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    res.json({
      users: users.map(u => ({
        _id: u._id,
        username: u.username,
        profilePicture: u.profilePicture,
        rank: u.rank,
        points: u.points,
      })),
      catches: catches.map(c => ({
        _id: c._id,
        species: c.species,
        weight: c.weight,
        location: c.location?.address || 'GPS Location',
        username: c.userId?.username || 'Unknown',
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
