# ⚡ Forgely | AI-Powered Content Repurposing Engine

**Forgely** is a sophisticated full-stack SaaS application designed to transform long-form content (URLs or raw topics) into a comprehensive multi-platform social media strategy in seconds. Built with the MERN stack and powered by **Google Gemini**, it automates the "forging" of raw ideas into polished, platform-specific posts.



## 🚀 Key Features

* **URL-to-Post Intelligence**: Integrated web scraping engine using Cheerio to extract core insights from any article link for context-aware content generation.
* **Multi-Platform Forging**: Tailored generation logic for LinkedIn, X (Twitter), YouTube, Instagram, and Facebook, ensuring platform-specific character counts and formatting.
* **Interactive Visual Mockups**: High-fidelity UI previews (Instagram, Facebook, LinkedIn) that simulate how content will appear on native social media feeds.
* **AI Visual Engine**: Generates contextually relevant, photorealistic images for social posts using **FLUX.1-schnell** via Hugging Face Inference.
* **The Vault (History Management)**: Persistent storage using MongoDB to save, edit, search, and delete previous content generations.
* **Smart Usage Quotas**: Custom credit system with automated 24-hour reset logic to manage API costs and user access.

## 🛠️ Tech Stack

### Frontend
- **React (Vite)**: Component-based UI for high performance.
- **Tailwind CSS**: Modern styling with glassmorphism and dark mode support.
- **Lucide React**: For consistent, professional iconography.
- **Firebase Auth**: Secure Google OAuth integration.

### Backend
- **Node.js & Express**: Scalable REST API architecture.
- **MongoDB & Mongoose**: Document-based storage for user history and usage tracking.
- **Cheerio**: Server-side DOM parsing for web scraping.

### AI Integration
- **Google Generative AI**: Powering the core content "forging" engine.
- **Hugging Face Inference**: Accessing FLUX.1 models for image generation.

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account
- Google Gemini API Key
- Hugging Face Token

### 2. Environment Configuration

**Server Folder (.env):**
GEMINI_API_KEY=your_key
MONGO_URI=your_mongodb_uri
HF_TOKEN=your_huggingface_token
PORT=5000

**Client Folder (.env):**
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=http://localhost:5000

### 3. Running the Project

# Terminal 1: Backend
cd server
npm install
npm start

# Terminal 2: Frontend
cd client
npm install
npm run dev

---

## 🧠 Technical Challenges & Lessons Learned



### 1. The Challenge of "Hallucination Control"
**Problem:** Initial AI outputs were mixing platform styles (e.g., putting hashtags in the middle of a LinkedIn post body).
**Solution:** Implemented strict System Prompting and structured JSON output requirements. By forcing the AI to return data in a specific schema, the frontend reliably parses and distributes content into the correct platform cards.

### 2. Efficient Web Scraping
**Problem:** Some websites block standard scrapers, and raw HTML is too large for AI context windows.
**Solution:** Used `Cheerio` to specifically target `<article>`, `<h1>`, and `<p>` tags, stripping away scripts and styles before sending text to Gemini. This reduced token usage by roughly 60% and improved response accuracy.

### 3. Real-time Preview Rendering
**Problem:** Displaying AI-generated text in a "static" way felt disconnected from the actual social media experience.
**Solution:** Developed a dynamic `renderPreviewUI` system that maps AI metadata (hashtags, handles, body) into CSS-styled mockups, providing users with an immediate visual feedback loop.

### 4. Handling State for Batch Processes
**Problem:** Generating 5 different posts and images simultaneously caused UI lag and state synchronization issues.
**Solution:** Implemented granular loading states for each individual platform card and used functional state updates in React to ensure the UI remains responsive while background "forging" is in progress.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

**Contact:** Durga Praveen Reddy - durgapraveennaidu@gmail.com
