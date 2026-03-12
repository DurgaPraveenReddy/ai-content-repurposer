import React, { useState, useEffect } from 'react';
import { 
  Send, Sparkles, Copy, Check, Linkedin, Twitter, 
  Youtube, Zap, History, LayoutDashboard, Facebook, Instagram, Trash2, X, 
  Search, Moon, Sun, LogOut, Lock, Share2, Clock, Image as ImageIcon, Loader2, Download, Edit3, Save, RefreshCw, Eye, Globe, ThumbsUp, MessageSquare, Repeat, Heart, MessageCircle, MoreHorizontal
} from 'lucide-react';
import axios from 'axios';

// Firebase Setup
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// COMPONENT: Reset Countdown
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

  // EDITING & RE-ROLL STATES
  const [currentGenId, setCurrentGenId] = useState(null);
  const [editableContent, setEditableContent] = useState({});
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [cardReRolling, setCardReRolling] = useState({});

  // Image states
  const [cardImages, setCardImages] = useState({});
  const [imageLoading, setImageLoading] = useState({});

  // NEW: PREVIEW STATES
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState({});

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

  const parseContent = (text) => {
    const platforms = [
      { id: 'linkedin', name: 'LinkedIn', icon: <Linkedin className="w-4 h-4 text-[#0A66C2]" />, marker: "|||LINKEDIN|||" },
      { id: 'twitter', name: 'Twitter', icon: <Twitter className="w-4 h-4 text-[#1DA1F2]" />, marker: "|||TWITTER|||" },
      { id: 'youtube', name: 'YouTube', icon: <Youtube className="w-4 h-4 text-[#FF0000]" />, marker: "|||YOUTUBE|||" },
      { id: 'facebook', name: 'Facebook', icon: <Facebook className="w-4 h-4 text-[#1877F2]" />, marker: "|||FACEBOOK|||" },
      { id: 'instagram', name: 'Instagram', icon: <Instagram className="w-4 h-4 text-[#E4405F]" />, marker: "|||INSTAGRAM|||" }
    ];

    return platforms.map(p => {
      // We use a Case-Insensitive check and trim the results
      const escapedMarker = p.marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`${escapedMarker}\\s*([\\s\\S]*?)(?=\\|\\|\\||$)`, 'i');
      const match = text.match(regex);

      if (match && match[1]) {
        let section = match[1].trim();
        // Remove double asterisks that Gemini loves to include
        section = section.replace(/\*\*(.*?)\*\*/g, '$1').trim();
        return { ...p, body: section };
      }
      return { ...p, body: null };
    }).filter(p => p.body); 
  };

  const handleGenerate = async () => {
    if (!topic || !user) return;
    setLoading(true);
    setContent(''); 
    setEditableContent({}); 
    setCardImages({}); 
    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate`, { 
        topic, 
        style, 
        uid: user.uid, 
        email: user.email 
      });
      const aiResponse = response.data.data;
      setContent(aiResponse);
      
      if (response.data.id) setCurrentGenId(response.data.id);

      const parsed = parseContent(aiResponse);
      const initialEdits = {};
      parsed.forEach(p => initialEdits[p.id] = p.body);
      setEditableContent(initialEdits);

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

  const handleReRollCard = async (platform) => {
    if (!topic || !user) return;
    setCardReRolling(prev => ({ ...prev, [platform.id]: true }));
    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate-single`, { 
        topic, 
        style, 
        platform: platform.name, 
        uid: user.uid 
      });
      
      const newBody = response.data.data;
      setEditableContent(prev => ({ ...prev, [platform.id]: newBody }));

      if (response.data.usage !== undefined) {
        setUsage(prev => ({
          ...prev,
          current: response.data.usage,
          lastReset: response.data.lastReset || prev.lastReset
        }));
      }

      if (currentGenId) {
        const platforms = parseContent(content);
        const updatedFullContent = platforms.map(p => {
          const body = p.id === platform.id ? newBody : (editableContent[p.id] || p.body);
          return `${p.marker}\n${body}`;
        }).join('\n\n');

        await axios.put(`${API_BASE_URL}/api/history/${currentGenId}`, {
          content: updatedFullContent
        });
        setContent(updatedFullContent);
      }
    } catch (error) {
      alert(error.response?.data?.error || "Individual re-roll failed.");
    } finally {
      setCardReRolling(prev => ({ ...prev, [platform.id]: false }));
    }
  };

  // NEW: PREVIEW HANDLER
const handleOpenPreview = async (platform, text, image) => {
    setPreviewLoading(prev => ({ ...prev, [platform.id]: true }));
    try {
      // Sends 'content' and 'platform'
      const response = await axios.post(`${API_BASE_URL}/api/preview-layout`, { 
        platform: platform.name, 
        content: text 
      });
      
      // Matches the 'layout' key from backend
      setPreviewData({ 
        ...response.data.layout, 
        image, 
        platformId: platform.id 
      });
    } catch (err) {
      console.error("Preview Error:", err);
      alert("Could not structure preview.");
    } finally {
      setPreviewLoading(prev => ({ ...prev, [platform.id]: false }));
    }
  };


const renderPreviewUI = () => {
    if (!previewData) return null;
    const { platformId, handle, body, image, hashtags, metadata, cta } = previewData;

    switch (platformId) {
      case 'linkedin':
        return (
          <div className="bg-white h-full flex flex-col font-sans text-slate-900">
            <div className="p-3 flex items-center gap-2 border-b border-slate-100">
              <div className="w-10 h-10 rounded bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">{handle[0]}</div>
              <div className="flex-1">
                <p className="text-[13px] font-bold">{handle} <span className="text-slate-400 font-normal">• 1st</span></p>
                <p className="text-[10px] text-slate-500">{metadata || "Professional Content Strategy"}</p>
                <p className="text-[9px] text-slate-400 flex items-center gap-1">2h • <Globe className="w-2.5 h-2.5"/></p>
              </div>
              <MoreHorizontal className="text-slate-400 w-5 h-5"/>
            </div>
            <div className="p-3 text-[13px] leading-relaxed whitespace-pre-wrap">{body}</div>
            {image && <img src={image} className="w-full object-cover max-h-56" alt="LI Content"/>}
            <div className="p-2 border-t border-slate-100 mt-auto flex justify-around">
              <div className="flex flex-col items-center gap-1"><ThumbsUp className="w-4 h-4 text-slate-400"/><span className="text-[9px]">Like</span></div>
              <div className="flex flex-col items-center gap-1"><MessageSquare className="w-4 h-4 text-slate-400"/><span className="text-[9px]">Comment</span></div>
              <div className="flex flex-col items-center gap-1"><Repeat className="w-4 h-4 text-slate-400"/><span className="text-[9px]">Repost</span></div>
              <div className="flex flex-col items-center gap-1"><Send className="w-4 h-4 text-slate-400"/><span className="text-[9px]">Send</span></div>
            </div>
          </div>
        );

      case 'twitter':
        return (
          <div className="bg-white h-full flex flex-col font-sans p-4 text-slate-900">
            <div className="flex gap-3">
              <div className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center font-black">𝕏</div>
              <div className="flex-1">
                <p className="font-bold text-[14px]">{handle} <span className="font-normal text-slate-500">@{handle.toLowerCase().replace(/\s/g,'')}</span></p>
                <p className="text-[14px] mt-1">{body}</p>
                <div className="text-sky-500 flex flex-wrap gap-1 mt-2">
                  {hashtags?.map(tag => <span key={tag}>#{tag}</span>)}
                </div>
                {image && <img src={image} className="mt-3 rounded-2xl border border-slate-100 w-full" alt="X Content"/>}
                <div className="flex justify-between mt-4 text-slate-400 max-w-[200px]">
                  <MessageCircle className="w-4 h-4"/><Repeat className="w-4 h-4"/><Heart className="w-4 h-4"/><Share2 className="w-4 h-4"/>
                </div>
              </div>
            </div>
          </div>
        );

      case 'instagram':
        return (
          <div className="bg-white h-full flex flex-col font-sans text-slate-900">
            <div className="p-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-0.5">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold">
                  {handle[0]}
                </div>
              </div>
              <span className="text-xs font-bold">{handle.toLowerCase().replace(/\s/g,'_')}</span>
              <MoreHorizontal className="ml-auto w-4 h-4" />
            </div>
            <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
              {image ? <img src={image} className="w-full h-full object-cover" alt="IG Post"/> : <Instagram className="w-12 h-12 text-slate-300"/>}
            </div>
            <div className="p-3">
              <div className="flex gap-4 mb-2">
                <Heart className="w-6 h-6" />
                <MessageCircle className="w-6 h-6" />
                <Send className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold mb-1">1,234 likes</p>
              <div className="text-xs leading-snug">
                <span className="font-bold mr-2">{handle.toLowerCase().replace(/\s/g,'_')}</span>
                {body.substring(0, 150)}...
                <span className="text-slate-400 block mt-1">more</span>
              </div>
              <div className="text-sky-800 text-[11px] mt-1">
                 {hashtags?.map(tag => <span key={tag} className="mr-1">#{tag}</span>)}
              </div>
            </div>
          </div>
        );

      case 'facebook':
        return (
          <div className="bg-white h-full flex flex-col font-sans text-slate-900">
            <div className="p-3 flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">{handle[0]}</div>
              <div>
                <p className="text-sm font-bold">{handle}</p>
                <p className="text-[11px] text-slate-500 flex items-center gap-1">Just now • <Globe className="w-3 h-3"/></p>
              </div>
            </div>
            <div className="px-3 pb-3 text-sm leading-normal">{body}</div>
            {image && <img src={image} className="w-full object-cover border-y border-slate-100" alt="FB Post"/>}
            <div className="p-2 flex border-t border-slate-100 mt-2">
               <div className="flex-1 flex justify-center items-center gap-2 py-1 hover:bg-slate-100 rounded text-slate-500"><ThumbsUp className="w-4 h-4"/> <span className="text-xs font-semibold">Like</span></div>
               <div className="flex-1 flex justify-center items-center gap-2 py-1 hover:bg-slate-100 rounded text-slate-500"><MessageSquare className="w-4 h-4"/> <span className="text-xs font-semibold">Comment</span></div>
               <div className="flex-1 flex justify-center items-center gap-2 py-1 hover:bg-slate-100 rounded text-slate-500"><Share2 className="w-4 h-4"/> <span className="text-xs font-semibold">Share</span></div>
            </div>
          </div>
        );

      case 'youtube':
        return (
          <div className="bg-white h-full flex flex-col font-sans text-slate-900">
            <div className="relative aspect-video bg-slate-200">
              {image ? <img src={image} className="w-full h-full object-cover" alt="YT Thumb"/> : <div className="w-full h-full flex items-center justify-center"><Youtube className="text-red-600 w-12 h-12"/></div>}
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1 rounded">10:42</div>
            </div>
            <div className="p-3">
              <h3 className="font-bold text-[15px] leading-snug mb-2">{body.split('.')[0]}...</h3>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-slate-200"/>
                <div className="flex-1">
                  <p className="text-[12px] font-bold">{handle}</p>
                  <p className="text-[10px] text-slate-500">{metadata || "1.2M subscribers"}</p>
                </div>
                <button className="bg-black text-white text-[11px] px-3 py-1.5 rounded-full font-bold">Subscribe</button>
              </div>
              <div className="bg-slate-100 rounded-xl p-3 text-[11px]">
                <p className="font-bold mb-1">Description</p>
                <p className="text-slate-600">{body.substring(0, 100)}...</p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white h-full p-6 flex flex-col items-center justify-center text-center text-slate-900">
            <div className="w-16 h-16 rounded-3xl bg-indigo-600 mb-4 flex items-center justify-center text-white font-bold text-2xl">{platformId[0].toUpperCase()}</div>
            <h3 className="font-bold mb-2">{handle}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">{body.substring(0, 150)}...</p>
            <div className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">{cta || "View Post"}</div>
          </div>
        );
    }
  };

  const handleUpdateContent = async (platformId) => {
    if (!currentGenId) return;
    try {
      const platforms = parseContent(content);
      const updatedFullContent = platforms.map(p => {
        const body = p.id === platformId ? editableContent[p.id] : (editableContent[p.id] || p.body);
        return `${p.marker}\n${body}`;
      }).join('\n\n');

      await axios.put(`${API_BASE_URL}/api/history/${currentGenId}`, {
        content: updatedFullContent
      });
      
      setContent(updatedFullContent);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to sync edits to cloud.");
    }
  };

  const handleGenerateImage = async (platformId, platformText) => {
    setImageLoading(prev => ({ ...prev, [platformId]: true }));
    try {
      const res = await axios.post(`${API_BASE_URL}/api/generate-image`, {
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

  const handleDownloadImage = (platformName, imageUrl) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${platformName}_AI_Image.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchHistory = async (uid) => {
    try {
      const targetUid = uid || user?.uid;
      const response = await axios.get(`${API_BASE_URL}/api/history/${targetUid}`);
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
      await axios.delete(`${API_BASE_URL}/api/history/${id}`);
      setHistoryData(prev => prev.filter(item => item._id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyAll = () => {
    const activeCards = parseContent(content);
    const allText = activeCards.map(p => `${p.name.toUpperCase()}\n${editableContent[p.id] || p.body}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(allText);
    alert("Full strategy copied to clipboard!");
  };

  const handleShare = async (platform) => {
    const activeText = editableContent[platform.id] || platform.body;
    const shareData = {
      title: `AI Content for ${platform.name}`,
      text: activeText,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share failed", err);
      }
    } else {
      navigator.clipboard.writeText(activeText);
      setCopiedId(platform.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const platformCards = content ? parseContent(content) : [];
  const filteredHistory = historyData.filter(item => item.topic.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${isDarkMode ? 'bg-[#030712] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {progress > 0 && (
        <div className="fixed top-0 left-0 h-1 bg-indigo-500 z-[100] transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      )}

      {/* PREVIEW MODAL */}
      {previewData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
           <button onClick={() => setPreviewData(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all group">
             <X className="text-white group-hover:rotate-90 transition-transform"/>
           </button>
           
           <div className="relative w-[320px] h-[640px] bg-black rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col scale-90 md:scale-100">
              {/* Phone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
              
              <div className="flex-1 overflow-y-auto bg-slate-50 pt-8 custom-scrollbar">
                {renderPreviewUI()}
              </div>

              {/* Phone Home Bar */}
              <div className="h-1.5 w-24 bg-slate-800 rounded-full mx-auto mb-2 mt-auto"></div>
           </div>
        </div>
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
                <div key={item._id} onClick={() => { 
                  setContent(item.content); 
                  setTopic(item.topic); 
                  setCurrentGenId(item._id);
                  const parsed = parseContent(item.content);
                  const historyEdits = {};
                  parsed.forEach(p => historyEdits[p.id] = p.body);
                  setEditableContent(historyEdits);
                  setCardImages({}); 
                  setShowHistory(false);
                }} className={`p-5 mb-3 rounded-2xl border flex justify-between items-center group cursor-pointer ${isDarkMode ? 'bg-white/[0.02] border-white/5 hover:bg-indigo-600/10' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
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
            <h1 className="text-2xl font-black uppercase tracking-tighter">Forgely</h1>
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
                    <><Send className="w-4 h-4" /> Generate</>
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
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/60">Strategy Ready</p>
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={handleGenerate} 
                        disabled={loading}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Re-Roll All
                      </button>
                      <button onClick={handleCopyAll} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors">
                        <Copy className="w-3 h-3" /> Copy Full Strategy
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in">
                    {platformCards.map((p) => (
                      <div key={p.id} className={`border rounded-[2rem] p-7 transition-all hover:translate-y-[-4px] flex flex-col ${isDarkMode ? 'bg-white/[0.03] border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-md'}`}>
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            {p.icon} 
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {/* NEW: PREVIEW BUTTON */}
                            <button 
                              onClick={() => handleOpenPreview(p, editableContent[p.id] || p.body, cardImages[p.id])}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/5 text-slate-500 hover:text-indigo-400"
                              title="Visual Preview"
                            >
                              {previewLoading[p.id] ? <Loader2 className="w-4 h-4 animate-spin"/> : <Eye className="w-4 h-4"/>}
                            </button>

                            <button 
                              onClick={() => handleReRollCard(p)}
                              disabled={cardReRolling[p.id] || loading}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/5 text-slate-500 hover:text-indigo-400 disabled:opacity-30"
                              title="Re-roll this card"
                            >
                              <RefreshCw className={`w-4 h-4 ${cardReRolling[p.id] ? 'animate-spin text-indigo-400' : ''}`} />
                            </button>

                            <button 
                              onClick={() => {
                                if (editingPlatform === p.id) {
                                  handleUpdateContent(p.id);
                                  setEditingPlatform(null);
                                } else {
                                  setEditingPlatform(p.id);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${editingPlatform === p.id ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/5 text-slate-500'}`}
                            >
                              {editingPlatform === p.id ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                            </button>

                            {!cardImages[p.id] && (
                              <button 
                                onClick={() => handleGenerateImage(p.id, editableContent[p.id] || p.body)} 
                                disabled={imageLoading[p.id]}
                                className="p-1.5 hover:bg-purple-500/10 rounded-lg transition-colors group disabled:opacity-50"
                              >
                                {imageLoading[p.id] ? <Loader2 className="w-4 h-4 text-purple-400 animate-spin" /> : <ImageIcon className="w-4 h-4 text-slate-500 group-hover:text-purple-400" />}
                              </button>
                            )}
                            <button onClick={() => handleShare(p)} className="p-1.5 hover:bg-indigo-500/10 rounded-lg transition-colors group">
                              <Share2 className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                            </button>
                            <button onClick={() => { 
                              const textToCopy = editableContent[p.id] || p.body;
                              navigator.clipboard.writeText(textToCopy); 
                              setCopiedId(p.id); 
                              setTimeout(() => setCopiedId(null), 2000); 
                            }}>
                              {copiedId === p.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-500 hover:text-indigo-400" />}
                            </button>
                          </div>
                        </div>
                        
                        {cardImages[p.id] && (
                          <div className="relative mb-4 rounded-xl overflow-hidden border border-white/5 group/img animate-in zoom-in-95">
                            <img src={cardImages[p.id]} alt="AI context" className="w-full h-40 object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                onClick={() => handleDownloadImage(p.name, cardImages[p.id])}
                                className="bg-white/90 p-2 rounded-full text-black hover:bg-white transition-all scale-90 group-hover/img:scale-100"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {editingPlatform === p.id ? (
                          <textarea
                            autoFocus
                            className={`w-full flex-grow text-sm leading-relaxed p-4 rounded-xl border outline-none min-h-[150px] resize-none ${isDarkMode ? 'bg-black/40 border-indigo-500/50 text-slate-100' : 'bg-slate-50 border-indigo-200'}`}
                            value={editableContent[p.id] || ''}
                            onChange={(e) => setEditableContent({...editableContent, [p.id]: e.target.value})}
                          />
                        ) : (
                          <div className={`text-sm leading-relaxed whitespace-pre-wrap flex-grow transition-opacity ${cardReRolling[p.id] ? 'opacity-40' : 'opacity-100'}`}>
                            {editableContent[p.id] || p.body}
                          </div>
                        )}
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