require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const hfToken = process.env.HF_TOKEN;



const Generation = require('./models/Generation');
const User = require('./models/User');

const app = express();
app.use(express.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- CONFIGURATION ---
const USAGE_LIMIT = 5; 

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Error:", err));

/**
 * Robust Scraper with Anti-Bot Headers
 * Scrapes the URL and returns clean text or null if failed.
 */
async function scrapeUrlContent(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 8000
    });

    const $ = cheerio.load(data);
    
    // Clean unnecessary tags
    $('script, style, nav, footer, header, aside, noscript, iframe').remove();
    
    const title = $('title').text() || $('h1').first().text() || "Web Content";
    const paragraphs = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50) paragraphs.push(text);
    });

    const bodyText = paragraphs.join('\n').substring(0, 6000); // Limit to avoid prompt token overflow
    return bodyText.length > 100 ? { title, bodyText } : null;
  } catch (error) {
    console.error(`⚠️ Scrape Failed for ${url}:`, error.message);
    return null; 
  }
}

// 1. GENERATE WITH URL-TO-CONTENT & GEMINI 2.0 FLASH
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

    if (hoursSinceReset >= 24) {
      user.generationCount = 0;
      user.lastReset = now;
    }

    // Check Limit
    if (user.generationCount >= USAGE_LIMIT) {
      return res.status(403).json({ 
        success: false, 
        error: `Daily limit reached (${USAGE_LIMIT}/${USAGE_LIMIT}).` 
      });
    }

    // --- URL DETECTION & SCRAPING ---
    let finalSourceMaterial = topic;
    let isUrl = false;
    
    // Check if input is a URL
    if (topic.trim().toLowerCase().startsWith('http')) {
      isUrl = true;
      const scraped = await scrapeUrlContent(topic.trim());
      
      if (scraped) {
        finalSourceMaterial = `TITLE: ${scraped.title}\n\nCONTENT: ${scraped.bodyText}`;
      } else {
        // Fallback: If scraping is blocked, tell Gemini to use its internal knowledge of that URL
        finalSourceMaterial = `The user provided this URL: ${topic}. I couldn't scrape the live text, so please generate the strategy based on your general knowledge of this link/domain or its likely content.`;
      }
    }

    // UPDATED TO GEMINI 2.5 FLASH
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are a world-class Social Media Strategist with a ${style} persona. 
      Repurpose the following source material into a multi-platform content strategy.

      SOURCE MATERIAL:
      "${finalSourceMaterial}"

      CONSTRAINTS:
      - Tone: Strictly ${style} throughout.
      - Formatting: Use the EXACT markers below for the frontend to parse.
      - Quality: Write ready-to-post copy, not summaries.

      |||LINKEDIN|||
      **[Engaging Headline]**
      [Professional yet ${style} post with bullet points and CTA]

      |||TWITTER|||
      **[Thread Hook]**
      [Follow-up 2-3 tweet structure]

      |||YOUTUBE|||
      **[Viral Title Suggestion]**
      [Script outline and engaging video description]

      |||FACEBOOK|||
      **[Community Headline]**
      [Detailed, relatable story-driven post]

      |||INSTAGRAM|||
      **[Punchy Caption Heading]**
      [Main caption with 5 niche hashtags]
    `;

    const result = await model.generateContent(prompt);
    const aiResponse = await result.response.text();

    // Save Generation
    const newGeneration = new Generation({
      topic: isUrl ? "Article Repurposed" : topic,
      content: aiResponse,
      userId: uid
    });
    await newGeneration.save();

    // Increment Usage
    user.generationCount += 1;
    await user.save();

    res.status(200).json({ 
      success: true, 
      data: aiResponse,
      usage: user.generationCount,
      lastReset: user.lastReset 
    });
  } catch (error) {
    console.error("Critical API Error:", error);
    res.status(500).json({ success: false, error: "Failed to generate content. The AI engine stalled." });
  }
});

// IMAGE GENERATION
app.post("/api/generate-image", async (req, res) => {
  try {
    const { text, uid } = req.body;
    if (!uid) return res.status(401).json({ error: "Auth required" });

    // 1. Prompt Engineering
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const promptEngineering = await model.generateContent(
      `Analyze: "${text.substring(0, 200)}". 
       Create a 1-sentence prompt for a photorealistic AI image. 
       Style: Professional photography, 8k, no text.
       Return only the prompt.`
    );
    const visualPrompt = promptEngineering.response.text();

    // 2. The Final Router URL & Strict Headers
    const hfRouterUrl = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

    const response = await axios({
      url: hfRouterUrl,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
        "Accept": "image/jpeg", // CRITICAL: Tell the router exactly what format to return
        "x-wait-for-model": "true" 
      },
      data: JSON.stringify({ inputs: visualPrompt }),
      responseType: 'arraybuffer', 
      timeout: 45000 
    });

    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    
    res.status(200).json({ 
      success: true, 
      url: `data:image/jpeg;base64,${base64Image}` 
    });

  } catch (error) {
    // This logs the exact reason from Hugging Face if it fails again
    const errorMsg = error.response?.data?.toString() || error.message;
    console.error("HF Router Detailed Error:", errorMsg);
    res.status(500).json({ error: "Image generation failed. Please try again." });
  }
});

// 2. GET HISTORY
app.get('/api/history/:uid', async (req, res) => {
  try {
    const history = await Generation.find({ userId: req.params.uid }).sort({ createdAt: -1 });
    const user = await User.findOne({ uid: req.params.uid });
    
    res.status(200).json({ 
      success: true, 
      data: history,
      usage: user ? user.generationCount : 0,
      limit: USAGE_LIMIT,
      lastReset: user ? user.lastReset : null
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