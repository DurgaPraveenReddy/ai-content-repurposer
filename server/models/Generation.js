const mongoose = require('mongoose');

const generationSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  content: { type: String, required: true },
  userId: { type: String, required: true }, // Ties the post to a specific Firebase UID
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Generation', generationSchema);