const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true }, // Firebase Unique ID
  email: { type: String, required: true },
  generationCount: { type: Number, default: 0 }, // Track usage
  lastReset: { type: Date, default: Date.now } // Optional: For daily resets
});

module.exports = mongoose.model('User', userSchema);