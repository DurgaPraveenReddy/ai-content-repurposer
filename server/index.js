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

// CONFIGURATION
const USAGE_LIMIT = 5; 
const MODEL_NAME = "gemini-3.1-flash-lite-preview";

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Error:", err));

/**
 * Robust Scraper with Anti-Bot Headers
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
    $('script, style, nav, footer, header, aside, noscript, iframe').remove();
    
    const title = $('title').text() || $('h1').first().text() || "Web Content";
    const paragraphs = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50) paragraphs.push(text);
    });

    const bodyText = paragraphs.join('\n').substring(0, 6000);
    return bodyText.length > 100 ? { title, bodyText } : null;
  } catch (error) {
    console.error(`⚠️ Scrape Failed for ${url}:`, error.message);
    return null; 
  }
}

// PREVIEW LAYOUT ENGINE
app.post("/api/preview-layout", async (req, res) => {
  try {
    // Changed 'text' to 'content' to match App.jsx
    const { content, platform } = req.body;

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
      Analyze the following ${platform} post text and return a JSON object with these fields:
      - handle: A realistic username (e.g., "ContentPro")
      - body: The main post content (cleaned of hashtags/meta headers)
      - hashtags: An array of strings (the hashtags found)
      - metadata: A short string (e.g., "Sponsored" or "2h ago")
      - cta: A short call to action (e.g., "Learn More")

      TEXT: "${content}"
      
      Return ONLY valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json|```/g, '').trim();
    const structuredData = JSON.parse(jsonString);

    // 2. Changed 'data' to 'layout' to match App.jsx 'response.data.layout'
    res.status(200).json({ 
      success: true, 
      layout: { ...structuredData } 
    });
  } catch (error) {
    console.error("Preview Parser Error:", error);
    res.status(500).json({ error: "Failed to parse preview layout" });
  }
});

// GENERATE WITH URL-TO-CONTENT
app.post("/api/generate", async (req, res) => {
  try {
    const { topic, style, uid, email } = req.body;

    if (!uid) return res.status(401).json({ error: "Authentication required." });

    let user = await User.findOne({ uid });
    if (!user) {
      user = await User.create({ uid, email, lastReset: new Date() });
    }

    const now = new Date();
    const lastReset = new Date(user.lastReset);
    const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      user.generationCount = 0;
      user.lastReset = now;
    }

    if (user.generationCount >= USAGE_LIMIT) {
      return res.status(403).json({ 
        success: false, 
        error: `Daily limit reached (${USAGE_LIMIT}/${USAGE_LIMIT}).` 
      });
    }

    let finalSourceMaterial = topic;
    let dbTopic = topic; 
    
    if (topic.trim().toLowerCase().startsWith('http')) {
      const scraped = await scrapeUrlContent(topic.trim());
      if (scraped) {
        finalSourceMaterial = `TITLE: ${scraped.title}\n\nCONTENT: ${scraped.bodyText}`;
        dbTopic = scraped.title; 
      } else {
        finalSourceMaterial = `The user provided this URL: ${topic}. I couldn't scrape the live text, so please generate the strategy based on your general knowledge of this link/domain or its likely content.`;
        dbTopic = topic;
      }
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const styleDefinitions = {
      Professional: "authoritative, insightful, and polished. Use industry jargon correctly and focus on ROI and value.",
      Witty: "clever, engaging, and observant. Use wordplay, light humor, and relatable metaphors to make a point.",
      Sarcastic: "dry, cynical, and biting. Use 'air quotes' in spirit, point out the obvious absurdities, and be unapologetically edgy."
    };

    const prompt = `
      SYSTEM: You are a world-class Social Media Strategist. Your personality is strictly ${style.toUpperCase()}.
      
      STYLE GUIDE: Your writing must be ${styleDefinitions[style]}.

      SOURCE MATERIAL:
      "${finalSourceMaterial}"

      TASK:
      Repurpose this material into 5 distinct posts. Every post must be a minimum of 150-200 words. 
      DO NOT summarize. Provide high-value, ready-to-publish copy.

      CRITICAL FORMATTING RULES:
      1. Use the EXACT markers below to separate platforms.
      2. Do NOT include any introductory or concluding remarks (e.g., "Here is your content").
      3. Start the response immediately with the first marker.
      4. Each post must be 150-200 words of deep-dive content.

      |||LINKEDIN|||
      **[Headline]**: Professional hook.
      **[Body]**: 3-4 deep paragraphs. End with a question.
      **[Required Tone]**: ${styleDefinitions[style]}

      |||TWITTER|||
      **[Hook]**: Viral thread starter.
      **[Thread]**: A 5-tweet sequence. Each tweet must be 200+ characters.
      **[Required Tone]**: Fast-paced, yet ${styleDefinitions[style]}

      |||YOUTUBE|||
      **[Title]**: 3 high-CTR options.
      **[Script Outline]**: Detailed Hook, Intro, 3 Value Points, and Outro.
      **[Description]**: A 200-word SEO description.
      **[Required Tone]**: Informative but strictly ${styleDefinitions[style]}

      |||FACEBOOK|||
      **[Body]**: A long-form, 250-word story-driven post focused on community.
      **[Required Tone]**: Relatable and ${styleDefinitions[style]}

      |||INSTAGRAM|||
      **[Heading]**: Punchy first line.
      **[Caption]**: A 3-paragraph "Educational" caption.
      **[Hashtags]**: 5 niche hashtags.
      **[Required Tone]**: Visually evocative and ${styleDefinitions[style]}
    `;

    const result = await model.generateContent(prompt);
    const aiResponse = await result.response.text();

    const newGeneration = new Generation({
      topic: dbTopic,
      content: aiResponse,
      userId: uid
    });
    
    const savedGen = await newGeneration.save();

    user.generationCount += 1;
    await user.save();

    res.status(200).json({ 
      success: true, 
      data: aiResponse,
      id: savedGen._id,
      usage: user.generationCount,
      lastReset: user.lastReset 
    });
  } catch (error) {
    console.error("Critical API Error:", error);
    res.status(500).json({ success: false, error: "Failed to generate content." });
  }
});

// INDIVIDUAL CARD RE-ROLL

app.post("/api/generate-single", async (req, res) => {
  try {
    const { topic, style, platform, uid } = req.body;
    if (!uid) return res.status(401).json({ error: "Auth required" });

    let user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    const lastReset = new Date(user.lastReset);
    const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      user.generationCount = 0;
      user.lastReset = now;
    }

    if (user.generationCount >= USAGE_LIMIT) {
      return res.status(403).json({ 
        success: false, 
        error: `Daily limit reached (${USAGE_LIMIT}/${USAGE_LIMIT}).` 
      });
    }

    const styleDefinitions = {
      Professional: "authoritative, insightful, and polished. Use industry jargon correctly and focus on ROI and value.",
      Witty: "clever, engaging, and observant. Use wordplay, light humor, and relatable metaphors to make a point.",
      Sarcastic: "dry, cynical, and biting. Use 'air quotes' in spirit, point out the obvious absurdities, and be unapologetically edgy."
    };

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const singlePrompt = `
          SYSTEM: You are a world-class Social Media Strategist. 
          Your personality is strictly ${style.toUpperCase()} (${styleDefinitions[style]}).

          TASK: Rewrite a high-value, deep-dive ${platform} post for: "${topic}".

          CRITICAL CONTENT REQUIREMENTS:
          1. DEPTH: The content must be a minimum of 150-200 words. 
          2. NO SUMMARIES: Do not just summarize the topic. Provide ready-to-publish, insightful copy.
          3. STRUCTURE: Use 3-4 deep, conversational paragraphs.
          4. TONE: Maintain a ${styleDefinitions[style]} voice throughout.

          FORMATTING INSTRUCTIONS:
          1. NO MARKDOWN LISTS: Do not use asterisks (*), dashes (-), or bullet points.
          2. NO BOLDING: Do not use double asterisks (**) for headers. Use plain text.
          3. EXACT HEADERS: Use simple brackets like [Title], [Headline], or [Body].

          PLATFORM STRUCTURE:
          If LinkedIn: [Headline], [Body] (3-4 deep paragraphs ending with a question)
          If Twitter: [Hook], [Thread] (A 5-tweet sequence, each tweet 200+ characters)
          If YouTube: [Title], [Script Outline] (Detailed Hook, Intro, 3 Value Points), [Description] (200-word SEO description)
          If Facebook: [Body] (250-word story-driven post)
          If Instagram: [Heading], [Caption] (3-paragraph educational caption), [Hashtags]

          OUTPUT: Return ONLY the text content. No markers like |||${platform.toUpperCase()}|||. 
        `;

    const result = await model.generateContent(singlePrompt);
    const aiResponse = await result.response.text();
    const cleanResponse = aiResponse.replace(/\*\*/g, '').trim();

    user.generationCount += 1;
    await user.save();

    res.status(200).json({ 
      success: true, 
      data: cleanResponse,
      usage: user.generationCount,
      lastReset: user.lastReset
    });
  } catch (error) {
    console.error("Single Gen Error:", error);
    res.status(500).json({ error: "Failed to re-roll this card." });
  }
});

// IMAGE GENERATION
app.post("/api/generate-image", async (req, res) => {
  try {
    const { text, uid } = req.body;
    if (!uid) return res.status(401).json({ error: "Auth required" });

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const promptEngineering = await model.generateContent(
      `Analyze: "${text.substring(0, 200)}". Create a 1-sentence prompt for a photorealistic AI image. Style: Professional photography, 8k, no text. Return only the prompt.`
    );
    const visualPrompt = promptEngineering.response.text();

    const hfRouterUrl = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

    const response = await axios({
      url: hfRouterUrl,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
        "Accept": "image/jpeg",
        "x-wait-for-model": "true" 
      },
      data: JSON.stringify({ inputs: visualPrompt }),
      responseType: 'arraybuffer', 
      timeout: 45000 
    });

    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    res.status(200).json({ success: true, url: `data:image/jpeg;base64,${base64Image}` });
  } catch (error) {
    console.error("HF Router Detailed Error:", error.message);
    res.status(500).json({ error: "Image generation failed." });
  }
});

// GET HISTORY
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

// UPDATE CONTENT (EDIT FEATURE)
app.put('/api/history/:id', async (req, res) => {
  try {
    const { content } = req.body;
    const updatedGen = await Generation.findByIdAndUpdate(
      req.params.id, 
      { content: content }, 
      { new: true }
    );
    
    if (!updatedGen) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }
    
    res.status(200).json({ success: true, data: updatedGen });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ success: false, error: "Failed to save edits" });
  }
});

// DELETE
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