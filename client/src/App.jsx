import React, { useState, useEffect } from 'react';
import { 
  Send, Sparkles, Copy, Check, Linkedin, Twitter, 
  Youtube, Zap, History, LayoutDashboard, Facebook, Instagram, Trash2, X, Search, Moon, Sun, LogOut, Lock
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

function App() {
  const [user, setUser] = useState(null);
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(''); 
  const [copiedId, setCopiedId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [usage, setUsage] = useState({ current: 0, limit: 5 });

  // 1. Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchHistory(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

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
    try {
      const response = await axios.post('http://localhost:5000/api/generate', { 
        topic, 
        style, 
        uid: user.uid, 
        email: user.email 
      });
      setContent(response.data.data);
      setUsage(prev => ({ ...prev, current: response.data.usage }));
    } catch (error) {
      alert(error.response?.data?.error || "Error generating content");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (uid) => {
    try {
      const targetUid = uid || user?.uid;
      const response = await axios.get(`http://localhost:5000/api/history/${targetUid}`);
      if (response.data.success) {
        setHistoryData(response.data.data);
        setUsage({ current: response.data.usage, limit: response.data.limit });
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
      
      {/* HISTORY MODAL */}
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
                placeholder="Search your history..." 
                className={`w-full p-3 rounded-xl border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="overflow-y-auto p-4 custom-scrollbar">
              {filteredHistory.map((item) => (
                <div key={item._id} onClick={() => { setContent(item.content); setTopic(item.topic); setShowHistory(false); }} className={`p-5 mb-3 rounded-2xl border flex justify-between items-center group cursor-pointer ${isDarkMode ? 'bg-white/[0.02] border-white/5 hover:bg-indigo-600/10' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                  <span className="font-semibold capitalize">{item.topic}</span>
                  <button onClick={(e) => handleDelete(e, item._id)} className="p-2 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
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
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Usage: {usage.current}/{usage.limit}</p>
                  <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(usage.current / usage.limit) * 100}%` }} />
                  </div>
                </div>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl border border-white/10">{isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}</button>
                <button onClick={() => fetchHistory()} className="p-2.5 rounded-xl border border-white/10"><History className="w-5 h-5" /></button>
                <button onClick={handleLogout} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/20">Logout</button>
              </>
            ) : (
              <button onClick={handleLogin} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20">Login</button>
            )}
          </div>
        </header>

        {/* MAIN BODY */}
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Lock className="w-16 h-16 text-indigo-500/20 mb-6" />
            <h2 className="text-4xl font-bold mb-4">Ready to Create?</h2>
            <p className="text-slate-500 mb-8">Login with Google to start generating multi-platform content plans.</p>
            <button onClick={handleLogin} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:scale-105 transition-all">Sign In with Google</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Input Sidebar */}
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
                <textarea className={`w-full border rounded-2xl p-5 outline-none mb-6 min-h-[150px] ${isDarkMode ? 'bg-black/40 border-white/5 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`} placeholder="What are we talking about today?" value={topic} onChange={(e) => setTopic(e.target.value)} />
                <button onClick={handleGenerate} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4.5 rounded-xl font-bold text-white transition-all disabled:opacity-50">
                  {loading ? "Igniting Engine..." : "Generate Plan"}
                </button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="lg:col-span-8">
              {platformCards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-6">
                  {platformCards.map((p) => (
                    <div key={p.id} className={`border rounded-[2rem] p-7 ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-md'}`}>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">{p.icon} <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{p.name}</span></div>
                        <button onClick={() => { navigator.clipboard.writeText(p.body); setCopiedId(p.id); setTimeout(() => setCopiedId(null), 2000); }}>
                          {copiedId === p.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
                        </button>
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{p.body}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-slate-600">
                  <LayoutDashboard className="w-12 h-12 mb-4 opacity-10" />
                  <p>Your multi-platform strategy will appear here.</p>
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
