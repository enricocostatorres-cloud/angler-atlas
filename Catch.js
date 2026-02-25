const mongoose = require('mongoose');

const catchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  species: {
    type: String,
    required: true,
  },
  weight: Number,
  length: Number,
  depth: Number,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    address: String,
  },
  lureUsed: String,
  waterConditions: {
    temperature: Number,
    clarity: String, // clear, murky, etc
    flowRate: String,
  },
  weather: {
    condition: String,
    temperature: Number,
    windSpeed: Number,
  },
  timeOfDay: String,
  catchTime: Date,
  releaseInfo: {
    wasReleased: { type: Boolean, default: false },
    releasedAt: Date,
    releasedHealthy: Boolean,
  },
  images: [String],
  notes: String,
  visibility: {
    type: String,
    default: 'public',
    enum: ['public', 'friends', 'private'],
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    text: String,
    createdAt: { type: Date, default: Date.now },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Geospatial index for location-based queries
catchSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('Catch', catchSchema);
