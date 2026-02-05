import React, { useState, useEffect } from 'react';
import { 
  Send, Sparkles, Copy, Check, Linkedin, Twitter, 
  Youtube, Zap, History, LayoutDashboard, Facebook, Instagram, Trash2, X, Search, Moon, Sun 
} from 'lucide-react';
import axios from 'axios';

function App() {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(''); 
  const [copiedId, setCopiedId] = useState(null);
  
  // Theme & History States
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setContent(''); 
    try {
      const response = await axios.post('http://localhost:5000/api/generate', { topic, style });
      if (response.data && response.data.data) {
        setContent(response.data.data);
      }
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/history');
      if (response.data.success) {
        setHistoryData(response.data.data);
        setShowHistory(true);
      }
    } catch (error) {
      console.error("History fetch error:", error);
    }
  };

  // THE RESTORED DELETE FEATURE
  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevents restoring the content when you just want to delete
    if (!window.confirm("Delete this content from your vault?")) return;
    
    try {
      const response = await axios.delete(`http://localhost:5000/api/history/${id}`);
      if (response.data.success) {
        setHistoryData(prev => prev.filter(item => item._id !== id));
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete.");
    }
  };

  const handleClear = () => {
    setTopic('');
    setContent('');
    setStyle('Professional');
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredHistory = historyData.filter(item => 
    item.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans selection:bg-indigo-500/30 ${isDarkMode ? 'bg-[#030712] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-2xl'} border w-full max-w-2xl rounded-[2rem] overflow-hidden flex flex-col max-h-[80vh]`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} /> Content Vault
                </h2>
                <button onClick={() => { setShowHistory(false); setSearchTerm(''); }} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-200'}`}><X className="w-6 h-6" /></button>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search history..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full ${isDarkMode ? 'bg-black/40 border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-900'} border rounded-xl py-3.5 pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-indigo-500 transition-all`}
                />
              </div>
            </div>
            <div className="overflow-y-auto p-4 custom-scrollbar">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <div 
                    key={item._id} 
                    onClick={() => { setContent(item.content); setTopic(item.topic); setShowHistory(false); }} 
                    className={`p-5 mb-3 rounded-2xl border transition-all flex justify-between items-center group cursor-pointer ${isDarkMode ? 'border-white/5 bg-white/[0.02] hover:bg-indigo-600/10' : 'border-slate-100 bg-white hover:bg-slate-50 shadow-sm'}`}
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-start mr-4">
                        <p className={`font-semibold capitalize ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.topic}</p>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 italic">Click to restore generation</p>
                    </div>
                    {/* RESTORED DELETE BUTTON */}
                    <button 
                      onClick={(e) => handleDelete(e, item._id)} 
                      className="p-2.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-slate-500 italic">No history found matching "{searchTerm}"</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <header className={`flex justify-between items-center mb-12 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-200'} pb-6`}>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20"><Zap className="w-6 h-6 text-white" /></div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">AI Content Hub</h1>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className={`p-2.5 rounded-xl border transition-all shadow-sm ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>
            <button onClick={fetchHistory} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold transition-all shadow-sm ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
              <History className="w-4 h-4 text-indigo-400" /> Vault
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className={`p-8 rounded-[2rem] sticky top-10 border transition-all ${isDarkMode ? 'bg-slate-900/40 border-white/10 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Ignite Engine</h2>
                </div>
                <button onClick={handleClear} className="p-2.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
              
              <div className="mb-6">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 block">Persona</label>
                <select value={style} onChange={(e) => setStyle(e.target.value)} className={`w-full border rounded-xl p-3.5 text-sm outline-none transition-all ${isDarkMode ? 'bg-black/40 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                  <option value="Professional">💼 Professional</option>
                  <option value="Funny">😂 Witty & Humorous</option>
                  <option value="Sarcastic">🙄 Bold & Sarcastic</option>
                  <option value="Inspirational">✨ Inspirational</option>
                </select>
              </div>

              <textarea className={`w-full border rounded-2xl p-5 outline-none transition-all resize-none mb-6 min-h-[180px] ${isDarkMode ? 'bg-black/40 border-white/5 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`} placeholder="What are we talking about today?" value={topic} onChange={(e) => setTopic(e.target.value)} />

              <button onClick={handleGenerate} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4.5 rounded-xl font-bold flex items-center justify-center gap-2 text-white transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-500/20">
                {loading ? <div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full" /> : <><Send className="w-4 h-4" /> Generate Content</>}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8">
            {platformCards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {platformCards.map((p) => (
                  <div key={p.id} className={`border rounded-[2rem] p-7 flex flex-col h-full hover:border-indigo-500/30 transition-all group ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-md'}`}>
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>{p.icon}</div>
                        <span className="font-bold text-[10px] tracking-widest uppercase text-slate-500">{p.name}</span>
                      </div>
                      <button onClick={() => copyToClipboard(p.body, p.id)} className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                        {copiedId === p.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                      </button>
                    </div>
                    <div className={`text-[0.925rem] leading-relaxed whitespace-pre-wrap flex-grow ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {p.body}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`h-full min-h-[500px] border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center text-center p-12 transition-colors ${isDarkMode ? 'border-white/5 text-slate-600' : 'border-slate-200 text-slate-400'}`}>
                <LayoutDashboard className="w-14 h-14 opacity-10 mb-6" />
                <p className="text-sm max-w-[280px]">Your generated content for LinkedIn, Twitter, and more will appear here as clean, copyable cards.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
