const express = require('express');
const User = require('../models/User');
const Catch = require('../models/Catch');

const router = express.Router();

// Get global leaderboard using aggregation pipeline
router.get('/', async (req, res, next) => {
  try {
    const timeframe = req.query.timeframe || 'all';
    let dateFilter = {};

    if (timeframe === 'week') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (timeframe === 'month') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    // Calculate points entirely in MongoDB — avoids loading all catches into memory
    const leaderboard = await Catch.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$userId',
          catchCount: { $sum: 1 },
          totalLikes: { $sum: { $size: '$likes' } },
          totalWeight: { $sum: { $ifNull: ['$weight', 0] } },
        },
      },
      {
        $addFields: {
          calculatedPoints: {
            $add: [
              { $multiply: ['$catchCount', 100] },
              { $multiply: ['$totalLikes', 10] },
              { $multiply: ['$totalWeight', 5] },
            ],
          },
        },
      },
      { $sort: { calculatedPoints: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: '$user.username',
          profilePicture: '$user.profilePicture',
          rank: '$user.rank',
          points: '$user.points',
          calculatedPoints: 1,
        },
      },
    ]);

    const enrichedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      position: index + 1,
    }));

    res.json(enrichedLeaderboard);
  } catch (error) {
    next(error);
  }
});

// Get user rank
router.get('/user/:userId', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username rank points profilePicture');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rankAbove = await User.countDocuments({ points: { $gt: user.points } });

    res.json({
      user,
      rank: rankAbove + 1,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
