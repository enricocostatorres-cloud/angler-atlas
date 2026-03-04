const express = require('express');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get current user — must be before /:userId to avoid route conflict
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Get user profile
router.get('/:userId', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/:userId', verifyToken, async (req, res, next) => {
  try {
    if (req.params.userId !== String(req.userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updates = {};
    const allowed = ['firstName', 'lastName', 'bio', 'location', 'profilePicture'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = String(req.body[field]).trim().slice(0, 500);
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Follow/unfollow user
router.post('/:userId/follow', verifyToken, async (req, res, next) => {
  try {
    if (req.params.userId === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.userId);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isFollowing = currentUser.following.some(id => id.equals(req.params.userId));

    if (isFollowing) {
      currentUser.following.pull(req.params.userId);
      userToFollow.followers.pull(req.userId);
    } else {
      currentUser.following.push(req.params.userId);
      userToFollow.followers.push(req.userId);
    }

    await currentUser.save();
    await userToFollow.save();

    res.json({
      message: isFollowing ? 'User unfollowed' : 'User followed',
      following: !isFollowing,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
