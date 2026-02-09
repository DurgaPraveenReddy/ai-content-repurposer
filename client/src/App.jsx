import React, { useState, useEffect } from 'react';
import { 
  Send, Sparkles, Copy, Check, Linkedin, Twitter, 
  Youtube, Zap, History, LayoutDashboard, Facebook, Instagram, Trash2, X, 
  Search, Moon, Sun, LogOut, Lock, Share2, Clock, Image as ImageIcon, Loader2
} from 'lucide-react';
import axios from 'axios';

// Firebase Setup
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDynCUi0DZK0E2I_kYIh18SsCD8PfGBQVY",
  authDomain: "ai-content-repurposer-a7ef5.firebaseapp.com",
  projectId: "ai-content-repurposer-a7ef5",
  storageBucket: "ai-content-repurposer-a7ef5.firebasestorage.app",
  messagingSenderId: "129917352375",
  appId: "1:129917352375:web:94909cb349324a8c999032"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- NEW COMPONENT: Reset Countdown ---
const ResetCountdown = ({ lastReset }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!lastReset) return;

    const calculateTime = () => {
      const resetTime = new Date(new Date(lastReset).getTime() + 24 * 60 * 60 * 1000);
      const diff = resetTime - new Date();

      if (diff <= 0) {
        setTimeLeft("Ready!");
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [lastReset]);

  return (
    <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-[11px] font-bold">
      <Clock className="w-3 h-3" />
      <span>RESETS IN: {timeLeft}</span>
    </div>
  );
};

// Advanced UI: Skeleton Loader
const SkeletonCard = () => (
  <div className="border rounded-[2rem] p-7 bg-white/5 border-white/10 animate-pulse">
    <div className="flex justify-between mb-4">
      <div className="h-4 w-24 bg-white/10 rounded-full"></div>
      <div className="h-4 w-4 bg-white/10 rounded"></div>
    </div>
    <div className="space-y-3">
      <div className="h-3 w-full bg-white/5 rounded"></div>
      <div className="h-3 w-5/6 bg-white/5 rounded"></div>
      <div className="h-3 w-4/6 bg-white/5 rounded"></div>
    </div>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [content, setContent] = useState(''); 
  const [copiedId, setCopiedId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [usage, setUsage] = useState({ current: 0, limit: 5, lastReset: null });

  // NEW: Image states
  const [cardImages, setCardImages] = useState({});
  const [imageLoading, setImageLoading] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchHistory(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let interval;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 5;
        });
      }, 200);
    } else {
      setProgress(100);
      const timeout = setTimeout(() => setProgress(0), 500);
      return () => clearTimeout(timeout);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleGenerate = async () => {
    if (!topic || !user) return;
    setLoading(true);
    setContent(''); 
    setCardImages({}); // Reset images on new generation
    try {
      const response = await axios.post('http://localhost:5000/api/generate', { 
        topic, 
        style, 
        uid: user.uid, 
        email: user.email 
      });
      setContent(response.data.data);
      setUsage(prev => ({ 
        ...prev, 
        current: response.data.usage,
        lastReset: response.data.lastReset || prev.lastReset 
      }));
    } catch (error) {
      alert(error.response?.data?.error || "Error generating content");
    } finally {
      setLoading(false);
    }
  };

  // NEW: Generate Image Function
  const handleGenerateImage = async (platformId, platformText) => {
    setImageLoading(prev => ({ ...prev, [platformId]: true }));
    try {
      const res = await axios.post('http://localhost:5000/api/generate-image', {
        text: platformText,
        uid: user.uid
      });
      setCardImages(prev => ({ ...prev, [platformId]: res.data.url }));
    } catch (err) {
      alert("Image engine is busy, try again in a moment!");
    } finally {
      setImageLoading(prev => ({ ...prev, [platformId]: false }));
    }
  };

  const fetchHistory = async (uid) => {
    try {
      const targetUid = uid || user?.uid;
      const response = await axios.get(`http://localhost:5000/api/history/${targetUid}`);
      if (response.data.success) {
        setHistoryData(response.data.data);
        setUsage({ 
          current: response.data.usage, 
          limit: response.data.limit,
          lastReset: response.data.lastReset 
        });
        if (!uid) setShowHistory(true);
      }
    } catch (error) {
      console.error("History error:", error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete forever?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/history/${id}`);
      setHistoryData(prev => prev.filter(item => item._id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyAll = () => {
    const allText = platformCards.map(p => `${p.name.toUpperCase()}\n${p.body}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(allText);
    alert("Full strategy copied to clipboard!");
  };

  const handleShare = async (platform) => {
    const shareData = {
      title: `AI Content for ${platform.name}`,
      text: platform.body,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share failed", err);
      }
    } else {
      navigator.clipboard.writeText(platform.body);
      setCopiedId(platform.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const parseContent = (text) => {
    const platforms = [
      { id: 'linkedin', name: 'LinkedIn', icon: <Linkedin className="w-4 h-4 text-[#0A66C2]" />, marker: "|||LINKEDIN|||" },
      { id: 'twitter', name: 'Twitter', icon: <Twitter className="w-4 h-4 text-[#1DA1F2]" />, marker: "|||TWITTER|||" },
      { id: 'youtube', name: 'YouTube', icon: <Youtube className="w-4 h-4 text-[#FF0000]" />, marker: "|||YOUTUBE|||" },
      { id: 'facebook', name: 'Facebook', icon: <Facebook className="w-4 h-4 text-[#1877F2]" />, marker: "|||FACEBOOK|||" },
      { id: 'instagram', name: 'Instagram', icon: <Instagram className="w-4 h-4 text-[#E4405F]" />, marker: "|||INSTAGRAM|||" }
    ];
    return platforms.map(p => {
      if (text.includes(p.marker)) {
        let section = text.split(p.marker)[1].split("|||")[0].trim();
        section = section.replace(/\*\*(.*?)\*\*/g, '$1').trim();
        return { ...p, body: section };
      }
      return { ...p, body: null };
    }).filter(p => p.body); 
  };

  const platformCards = content ? parseContent(content) : [];
  const filteredHistory = historyData.filter(item => item.topic.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${isDarkMode ? 'bg-[#030712] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {progress > 0 && (
        <div className="fixed top-0 left-0 h-1 bg-indigo-500 z-[100] transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'} border w-full max-w-2xl rounded-[2rem] overflow-hidden flex flex-col max-h-[80vh]`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><History className="text-indigo-400" /> Your Vault</h2>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-black/10 rounded-full"><X /></button>
              </div>
              <input 
                type="text" 
                placeholder="Search history..." 
                className={`w-full p-3 rounded-xl border ${isDarkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="overflow-y-auto p-4 custom-scrollbar">
              {filteredHistory.map((item) => (
                <div key={item._id} onClick={() => { setContent(item.content); setTopic(item.topic); setCardImages({}); setShowHistory(false); }} className={`p-5 mb-3 rounded-2xl border flex justify-between items-center group cursor-pointer ${isDarkMode ? 'bg-white/[0.02] border-white/5 hover:bg-indigo-600/10' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                  <span className="font-semibold capitalize">{item.topic}</span>
                  <button onClick={(e) => handleDelete(e, item._id)} className="p-2 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-10">
        <header className={`flex justify-between items-center mb-12 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-200'} pb-6`}>
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-indigo-500" />
            <h1 className="text-2xl font-black uppercase tracking-tighter">AI Hub</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:block text-right mr-2">
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Usage: {usage.current}/{usage.limit}</p>
                    <ResetCountdown lastReset={usage.lastReset} />
                  </div>
                  <div className="w-32 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500" 
                      style={{ width: `${(usage.current / usage.limit) * 100}%` }} 
                    />
                  </div>
                </div>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-white/5">{isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}</button>
                <button onClick={() => fetchHistory()} className="p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-white/5"><History className="w-5 h-5" /></button>
                <button onClick={handleLogout} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all">Logout</button>
              </>
            ) : (
              <button onClick={handleLogin} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20">Login</button>
            )}
          </div>
        </header>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Lock className="w-16 h-16 text-indigo-500/20 mb-6" />
            <h2 className="text-4xl font-bold mb-4">Ready to Create?</h2>
            <p className="text-slate-500 mb-8 text-center max-w-md">Login with Google to start generating multi-platform content plans in seconds.</p>
            <button onClick={handleLogin} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-indigo-500/20">Sign In with Google</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <div className={`p-8 rounded-[2rem] sticky top-10 border ${isDarkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
                <div className="mb-6">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 block">Persona</label>
                  <select value={style} onChange={(e) => setStyle(e.target.value)} className={`w-full p-3.5 rounded-xl border outline-none ${isDarkMode ? 'bg-black/40 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                    <option value="Professional">Professional</option>
                    <option value="Witty">Witty</option>
                    <option value="Sarcastic">Sarcastic</option>
                  </select>
                </div>
                <textarea className={`w-full border rounded-2xl p-5 outline-none mb-6 min-h-[150px] transition-all focus:ring-2 focus:ring-indigo-500/20 ${isDarkMode ? 'bg-black/40 border-white/5 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`} placeholder="Paste a blog URL or describe your topic..." value={topic} onChange={(e) => setTopic(e.target.value)} />
                <button onClick={handleGenerate} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <><Sparkles className="w-4 h-4 animate-spin" /> Thinking...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Generate Plan</>
                  )}
                </button>
              </div>
            </div>

            <div className="lg:col-span-8">
              {loading ? (
                <div className="space-y-4">
                  <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 animate-pulse">Assembling Your Strategy...</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                  </div>
                </div>
              ) : platformCards.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex justify-end gap-4">
                    <button onClick={handleCopyAll} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors">
                      <Copy className="w-3 h-3" /> Copy Full Strategy
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in">
                    {platformCards.map((p) => (
                      <div key={p.id} className={`border rounded-[2rem] p-7 transition-all hover:translate-y-[-4px] ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-md'}`}>
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            {p.icon} 
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* NEW: Generate Image Button */}
                            {!cardImages[p.id] && (
                              <button 
                                onClick={() => handleGenerateImage(p.id, p.body)} 
                                disabled={imageLoading[p.id]}
                                className="p-1.5 hover:bg-purple-500/10 rounded-lg transition-colors group disabled:opacity-50"
                                title="Magic Image"
                              >
                                {imageLoading[p.id] ? <Loader2 className="w-4 h-4 text-purple-400 animate-spin" /> : <ImageIcon className="w-4 h-4 text-slate-500 group-hover:text-purple-400" />}
                              </button>
                            )}
                            <button onClick={() => handleShare(p)} className="p-1.5 hover:bg-indigo-500/10 rounded-lg transition-colors group">
                              <Share2 className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(p.body); setCopiedId(p.id); setTimeout(() => setCopiedId(null), 2000); }}>
                              {copiedId === p.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-500 hover:text-indigo-400" />}
                            </button>
                          </div>
                        </div>
                        {/* NEW: Image Preview */}
                        {cardImages[p.id] && (
                          <div className="mb-4 rounded-xl overflow-hidden border border-white/5 animate-in zoom-in-95">
                            <img src={cardImages[p.id]} alt="AI context" className="w-full h-40 object-cover" />
                          </div>
                        )}
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">{p.body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-slate-600">
                  <LayoutDashboard className="w-12 h-12 mb-4 opacity-10" />
                  <p className="font-medium text-center px-4">Enter a topic and hit generate to begin.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;