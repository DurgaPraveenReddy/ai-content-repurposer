require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const Generation = require('./models/Generation');
const User = require('./models/User');

const app = express();
app.use(express.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- CONFIGURATION ---
const USAGE_LIMIT = 5; // Set your limit here

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// 1. GENERATE WITH DAILY LIMIT RESET
app.post("/api/generate", async (req, res) => {
  try {
    const { topic, style, uid, email } = req.body;

    if (!uid) return res.status(401).json({ error: "Authentication required." });

    // Find user or create if new
    let user = await User.findOne({ uid });
    if (!user) {
      user = await User.create({ uid, email, lastReset: new Date() });
    }

    // --- DAILY RESET LOGIC ---
    const now = new Date();
    const lastReset = new Date(user.lastReset);
    const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

    // If more than 24 hours have passed, reset the count
    if (hoursSinceReset >= 24) {
      user.generationCount = 0;
      user.lastReset = now;
      // We don't await save here yet, we'll do it after checking the limit
    }
    // --------------------------

    // Check Limit (After potential reset)
    if (user.generationCount >= USAGE_LIMIT) {
      return res.status(403).json({ 
        success: false, 
        error: `Daily limit reached (${USAGE_LIMIT}/${USAGE_LIMIT}). Reset occurs 24h after your last usage.` 
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      As an expert marketing strategist with a ${style} persona, generate COMPLETE content for "${topic}".
      The tone of all content must be strictly ${style}.
      
      You MUST provide ALL five platforms. Use the EXACT unique markers below:

      |||LINKEDIN|||
      **[Bold Headline]**
      [Content]

      |||TWITTER|||
      **[Thread Title]**
      [Content]

      |||YOUTUBE|||
      **[Video Title]**
      [Content]

      |||FACEBOOK|||
      **[Headline]**
      [Content]

      |||INSTAGRAM|||
      **[Caption Heading]**
      [Content]

      Ensure the ${style} tone is consistent across every section.
    `;

    const result = await model.generateContent(prompt);
    const aiResponse = await result.response.text();

    // Save Generation
    const newGeneration = new Generation({
      topic,
      content: aiResponse,
      userId: uid
    });
    await newGeneration.save();

    // Increment Usage and Save User State
    user.generationCount += 1;
    await user.save();

    res.status(200).json({ 
      success: true, 
      data: aiResponse,
      usage: user.generationCount 
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ success: false, error: "Failed to generate content." });
  }
});

// 2. GET HISTORY (ONLY FOR LOGGED IN USER)
app.get('/api/history/:uid', async (req, res) => {
  try {
    const history = await Generation.find({ userId: req.params.uid }).sort({ createdAt: -1 });
    const user = await User.findOne({ uid: req.params.uid });
    
    res.status(200).json({ 
      success: true, 
      data: history,
      usage: user ? user.generationCount : 0,
      limit: USAGE_LIMIT
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Could not fetch history" });
  }
});

// 3. DELETE
app.delete('/api/history/:id', async (req, res) => {
  try {
    await Generation.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Delete failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));