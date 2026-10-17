const mongoose = require('mongoose');

const BinSchema = new mongoose.Schema(
  {
    binId: {
      type: String,
      required: [true, 'Bin ID is required'],
      unique: true,
      trim: true,
    },
    location: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
        min: -180,
        max: 180,
      },
    },
    fillPercentage: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['Normal', 'Warning', 'Critical'],
      default: 'Normal',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/**
 * Derive status from fillPercentage before saving.
 * 0–50%   → Normal
 * 50–80%  → Warning
 * 80–100% → Critical
 */
BinSchema.pre('save', function (next) {
  if (this.fillPercentage <= 50) {
    this.status = 'Normal';
  } else if (this.fillPercentage <= 80) {
    this.status = 'Warning';
  } else {
    this.status = 'Critical';
  }
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Bin', BinSchema);
