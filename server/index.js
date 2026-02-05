// 1. Core Imports
require('dotenv').config(); // MUST be at the very top
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 2. Model Import (We'll use this in Day 2)
const Generation = require('./models/Generation');

// 3. Initialize App and Middleware
const app = express();
app.use(express.json()); // Essential to parse JSON body from Postman/Frontend
app.use(cors()); // Allows your React frontend to talk to this backend

// 4. AI Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 5. MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Successfully connected to MongoDB Atlas"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Exit if database fails to connect
  });

// 6. The Generation Route (Now with Database Logic)
app.post("/api/generate", async (req, res) => {
  try {
    
    // Choose the most recent model (2026 standard)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const { topic, style } = req.body;

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

    // SAVING TO DATABASE: This is what makes it a real project
    const newGeneration = new Generation({
      topic: topic,
      content: aiResponse
    });
    await newGeneration.save();

    res.status(200).json({ 
      success: true, 
      data: aiResponse,
      message: "Content generated and saved successfully!" 
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ success: false, error: "Failed to generate content." });
  }
});

// Add this to your server/index.js
app.get('/api/history', async (req, res) => {
  try {
    // 1. Ensure 'Generation' matches the model name in your save route
    // 2. We sort by newest first (-1) and limit to 10 for performance
    const history = await Generation.find().sort({ createdAt: -1 }).limit(10);
    
    res.status(200).json({ 
      success: true, 
      data: history 
    });
  } catch (error) {
    // This will print the EXACT error in your terminal so you can see why it failed
    console.error("Database Fetch Error:", error); 
    res.status(500).json({ 
      success: false, 
      error: "Could not fetch history from database" 
    });
  }
});

// Add this to your server/index.js
app.delete('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Generation.findByIdAndDelete(id); // Ensure 'Generation' matches your model name
    res.status(200).json({ success: true, message: "Generation deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ success: false, error: "Failed to delete item" });
  }
});

// 7. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});