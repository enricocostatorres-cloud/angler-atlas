const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  firstName: String,
  lastName: String,
  bio: String,
  profilePicture: String,
  location: String,
  rank: {
    type: String,
    default: 'Novice Angler',
    enum: ['Novice Angler', 'Intermediate Angler', 'Master Angler', 'Legend'],
  },
  points: {
    type: Number,
    default: 0,
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  preferences: {
    notifications: { type: Boolean, default: true },
    privateProfile: { type: Boolean, default: false },
    subscriptionTier: {
      type: String,
      default: 'free',
      enum: ['free', 'premium'],
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to return user without password
userSchema.methods.toJSON = function() {
  const { password, ...user } = this.toObject();
  return user;
};

module.exports = mongoose.model('User', userSchema);
