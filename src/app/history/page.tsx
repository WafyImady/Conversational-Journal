"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Search, Sparkles, TrendingUp, Calendar as CalendarIcon, Loader2, X, Check } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/utils/client";

// --- GO-EMOTIONS 28-LABEL SCORING ---
const emotionScores: Record<string, number> = {
  admiration: 90, amusement: 85, approval: 80, caring: 85, desire: 80, 
  excitement: 95, gratitude: 90, joy: 95, love: 95, optimism: 85, pride: 85, relief: 80,
  confusion: 40, curiosity: 60, realization: 60, surprise: 60, neutral: 50,
  anger: 10, annoyance: 25, disapproval: 25, disgust: 10, disappointment: 20,
  embarrassment: 20, fear: 15, grief: 5, nervousness: 30, remorse: 15, sadness: 10
};

const getUIEmotionData = (hfMood: string) => {
  const m = hfMood?.toLowerCase() || 'neutral';
  if (['admiration', 'amusement', 'approval', 'caring', 'desire', 'excitement', 'gratitude', 'joy', 'love', 'optimism', 'pride', 'relief'].includes(m)) {
    return { label: m.charAt(0).toUpperCase() + m.slice(1), color: 'text-green-600 bg-green-50 border-green-200', category: 'Happy' };
  }
  if (['curiosity', 'realization', 'surprise'].includes(m)) {
    return { label: m.charAt(0).toUpperCase() + m.slice(1), color: 'text-blue-600 bg-blue-50 border-blue-200', category: 'Neutral' };
  }
  if (['confusion', 'embarrassment', 'fear', 'nervousness'].includes(m)) {
    return { label: m.charAt(0).toUpperCase() + m.slice(1), color: 'text-purple-600 bg-purple-50 border-purple-200', category: 'Anxious' };
  }
  if (['anger', 'annoyance', 'disappointment', 'disapproval', 'disgust', 'grief', 'remorse', 'sadness'].includes(m)) {
    return { label: m.charAt(0).toUpperCase() + m.slice(1), color: 'text-orange-600 bg-orange-50 border-orange-200', category: 'Stressed' };
  }
  return { label: 'Neutral', color: 'text-gray-600 bg-gray-50 border-gray-200', category: 'Neutral' };
};

export default function ArchivePage() {
  const supabase = createClient();
  
  // State Management
  const [timeFilter, setTimeFilter] = useState("Month");
  const [activeMood, setActiveMood] = useState("All");
  const [searchQuery, setSearchQuery] = useState(""); 
  const [selectedDate, setSelectedDate] = useState(""); 
  
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({ avgStress: 0, totalEntries: 0, topEmotion: "N/A" });
  const [refreshKey, setRefreshKey] = useState(0);

  // Data Processor Helper
  const processJournalData = (data: any[]) => {
    const dailyScores: Record<string, { total: number, count: number }> = {};
    const emotionCounts: Record<string, number> = {};
    let globalScoreTotal = 0;
    let validScoreCount = 0;

    const formattedEntries = data.map((entry) => {
      const dateObj = new Date(entry.created_at);
      let emotion = 'Neutral';
      
      // Safely parse verified emotions
      if (entry.emotions) {
        let parsed = entry.emotions;

        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch (e) {}
        }

        // --- NEW CHECK: Handle the explicit primary/background object format ---
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.primary) {
          parsed = parsed.primary; // Reassign 'parsed' to be the primary array!
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          const sorted = [...parsed].sort((a, b) => (b.intensity || 0) - (a.intensity || 0));
          const primary = sorted[0];
          emotion = primary.name || primary.label || primary.emotion || 'Neutral';
        } else if (typeof parsed === 'string') {
          emotion = parsed.split(',')[0].trim();
        }
      }

      const emotionKey = emotion.toLowerCase(); 
      emotionCounts[emotionKey] = (emotionCounts[emotionKey] || 0) + 1;
      const score = emotionScores[emotionKey] !== undefined ? emotionScores[emotionKey] : 50; 
      const dateKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); 
      
      if (!dailyScores[dateKey]) dailyScores[dateKey] = { total: 0, count: 0 };
      dailyScores[dateKey].total += score;
      dailyScores[dateKey].count += 1;
      globalScoreTotal += score;
      validScoreCount += 1;

      const uiData = getUIEmotionData(emotionKey);

      let formattedChat = "";
      if (Array.isArray(entry.chat_transcript)) {
        formattedChat = entry.chat_transcript
          .filter((msg: any) => msg.content) 
          .map((msg: any) => `${msg.role === 'user' ? 'You' : 'Echo'}:\n${msg.content}`)
          .join('\n\n');
      } else if (typeof entry.chat_transcript === 'string') {
        formattedChat = entry.chat_transcript;
      }

      let parsedActions = entry.action_items || null;
      if (typeof parsedActions === 'string') { 
        try {
          parsedActions = JSON.parse(parsedActions);
        } catch (e) {
          console.warn("Failed to parse actions:", e);
        }
      }

      return {
        id: entry.id,
        rawDate: dateObj.toLocaleDateString('en-CA'), 
        date: dateObj.toLocaleDateString('en-US', { day: '2-digit' }),
        month: dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        time: dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        mood: uiData.label,
        moodColor: uiData.color,
        moodCategory: uiData.category, 
        title: "Daily Reflection", 
        userText: formattedChat,               
        snippet: entry.narrative || "No summary available...",
        actions: parsedActions                 
      };
    });

    const finalChartData = Object.keys(dailyScores).map(date => ({
      date,
      value: Math.round(dailyScores[date].total / dailyScores[date].count)
    }));

    const topEmotionStr = Object.keys(emotionCounts).length > 0 
      ? Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b) 
      : "N/A";
      
    const avgWellBeing = validScoreCount > 0 ? (globalScoreTotal / validScoreCount) : 50;
    const stressLevel = ((100 - avgWellBeing) / 10).toFixed(1); 

    setChartData(finalChartData);
    setStats({ 
      avgStress: parseFloat(stressLevel), 
      totalEntries: data.length, 
      topEmotion: topEmotionStr.charAt(0).toUpperCase() + topEmotionStr.slice(1) 
    });
    setJournalEntries(formattedEntries.reverse());
  };

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      const startDate = new Date();
      if (timeFilter === "Week") startDate.setDate(startDate.getDate() - 7);
      else if (timeFilter === "Month") startDate.setMonth(startDate.getMonth() - 1);
      else if (timeFilter === "Semester") startDate.setMonth(startDate.getMonth() - 6); 

      let query = supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (selectedDate) {
        const pickedDate = new Date(selectedDate);
        query = query.gte('created_at', pickedDate < startDate ? pickedDate.toISOString() : startDate.toISOString());
      } else {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        processJournalData(data);
      } else {
        setChartData([]);
        setJournalEntries([]);
      }
      
      setIsLoading(false);
    }

    fetchData();
  }, [supabase, timeFilter, selectedDate, refreshKey]);


  const toggleActionCompletion = async (entryId: string, actionIndex: number) => {
    if (!selectedEntry || selectedEntry.id !== entryId) return;

    const updatedActions = selectedEntry.actions.map((action: any, idx: number) =>
      idx === actionIndex ? { ...action, completed: !action.completed } : action
    );

    setSelectedEntry({ ...selectedEntry, actions: updatedActions });

    setJournalEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === entryId ? { ...entry, actions: updatedActions } : entry
      )
    );

    const { error } = await supabase
      .from('journal_entries')
      .update({ action_items: updatedActions })
      .eq('id', entryId);

    if (error) console.error("Failed to save action item to database:", error);
  };
  
  // --- NEW: The Deletion Engine ---
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this reflection? This cannot be undone.")) return;

    const { error } = await supabase
      .from('journal_entries')
      .update({ is_deleted: true })
      .eq('id', entryId);

    if (error) {
      console.error("Failed to delete entry:", error);
      return;
    }

    setSelectedEntry(null); // Close the modal
    setRefreshKey(prev => prev + 1); // Trigger charts to recalculate instantly!
  };

  const filteredEntries = journalEntries.filter((entry) => {
    const matchesMood = activeMood === "All" || entry.moodCategory === activeMood;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
                          entry.title.toLowerCase().includes(searchLower) || 
                          entry.snippet.toLowerCase().includes(searchLower) ||
                          entry.mood.toLowerCase().includes(searchLower);
    
    const matchesDate = !selectedDate || entry.rawDate === selectedDate;

    return matchesMood && matchesSearch && matchesDate;
  });

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-grow flex flex-col h-screen overflow-y-auto relative border-r border-[#E5E2DB]">
        <div className="p-6 lg:p-10 text-gray-800 w-full max-w-7xl mx-auto">
          
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <CalendarIcon className="w-4 h-4" />
              <span>/ Archive</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2 font-serif tracking-tight">Historical Archive</h1>
            <p className="text-gray-500 text-base">Your personal growth journey, one thoughtful entry at a time.</p>
          </div>

          <div className="flex flex-col xl:flex-row items-start xl:items-center gap-5 mb-8 w-full">
            
            <div className="relative w-full xl:max-w-md shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search your memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-[#8EACA0] transition-all text-sm font-medium shadow-sm"
              />
            </div>
            
            <div className="flex gap-2.5 overflow-x-auto w-full pb-2 xl:pb-0 hide-scrollbar items-center">
              <button onClick={() => setActiveMood("All")} className={`px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all ${activeMood === "All" ? "bg-[#D9A083] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>≡ All Moods</button>
              <button onClick={() => setActiveMood("Happy")} className={`px-5 py-2.5 rounded-2xl border border-green-200 text-green-600 text-sm font-semibold flex items-center gap-2 whitespace-nowrap bg-white hover:bg-green-50 transition-all ${activeMood === "Happy" ? "ring-2 ring-green-400 bg-green-50" : ""}`}>☺ Happy</button>
              <button onClick={() => setActiveMood("Neutral")} className={`px-5 py-2.5 rounded-2xl border border-blue-200 text-blue-600 text-sm font-semibold flex items-center gap-2 whitespace-nowrap bg-white hover:bg-blue-50 transition-all ${activeMood === "Neutral" ? "ring-2 ring-blue-400 bg-blue-50" : ""}`}>😶 Neutral</button>
              <button onClick={() => setActiveMood("Stressed")} className={`px-5 py-2.5 rounded-2xl border border-orange-200 text-orange-600 text-sm font-semibold flex items-center gap-2 whitespace-nowrap bg-white hover:bg-orange-50 transition-all ${activeMood === "Stressed" ? "ring-2 ring-orange-400 bg-orange-50" : ""}`}>☹ Stressed</button>
              <button onClick={() => setActiveMood("Anxious")} className={`px-5 py-2.5 rounded-2xl border border-purple-200 text-purple-600 text-sm font-semibold flex items-center gap-2 whitespace-nowrap bg-white hover:bg-purple-50 transition-all ${activeMood === "Anxious" ? "ring-2 ring-purple-400 bg-purple-50" : ""}`}>😟 Anxious</button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 w-full">
              <Loader2 className="w-10 h-10 text-[#D28C81] animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Decrypting your emotional history...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Emotional Trends</h2>
                      <p className="text-sm text-gray-500">Observing your balance over time</p>
                    </div>

                    <div className="flex bg-[#FAF9F6] rounded-full p-1 border border-gray-200 shadow-sm shrink-0">
                      {["Week", "Month", "Semester"].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setTimeFilter(filter)}
                          className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            timeFilter === filter ? "bg-[#D28C81] text-white shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ width: '100%', height: 300 }} className="mt-6">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                          <YAxis hide domain={[0, 100]} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ stroke: '#E5E7EB', strokeWidth: 2, strokeDasharray: '4 4' }}/>
                          <Line type="monotone" dataKey="value" stroke="#98AC92" strokeWidth={6} dot={{ r: 6, fill: '#FAF9F6', stroke: '#98AC92', strokeWidth: 4 }} activeDot={{ r: 8, fill: '#98AC92', stroke: '#FAF9F6', strokeWidth: 3 }}/>
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">Not enough data to plot yet.</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-sm font-semibold text-gray-500 mb-2">Avg. Stress Level</p>
                    <div className="flex items-end gap-3 mb-3">
                      <span className="text-3xl font-extrabold text-gray-900">{stats.avgStress}</span><span className="text-xs font-bold text-gray-500 mb-1">/ 10</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#E5E0D8] rounded-full transition-all duration-1000" style={{ width: `${(stats.avgStress / 10) * 100}%` }}></div>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-sm font-semibold text-gray-500 mb-2">Entries Logged</p>
                    <div className="flex items-end gap-3 mb-3">
                      <span className="text-3xl font-extrabold text-gray-900">{stats.totalEntries}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#D9A083] w-full rounded-full"></div>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-sm font-semibold text-gray-500 mb-2">Top Emotion</p>
                    <div className="flex items-end gap-3 mb-3 truncate">
                      <span className="text-2xl font-extrabold text-gray-900 truncate">{stats.topEmotion}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#8EACA0] w-full rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* --- UPGRADATION: DYNAMIC PATTERN INSIGHTS CARD --- */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-5 items-start">
                  <div className="bg-[#FCF4F2] p-3 rounded-2xl shrink-0">
                    <Sparkles className="w-6 h-6 text-[#D28C81]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Weekly Pattern Insight</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {stats.totalEntries === 0 ? (
                        "Your archive is a clean slate. Once you begin reflecting with Echo, this space will map out cognitive shifts, behavioral triggers, and macro emotional patterns over time."
                      ) : stats.avgStress > 6.5 ? (
                        <>
                          Your emotional timeline indicates an elevated baseline of 
                          <span className="font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded ml-1 mr-1 capitalize">{stats.topEmotion}</span> 
                          tendencies, with your stress peaking at <span className="font-bold text-gray-800">{stats.avgStress}/10</span>. 
                          This structural accumulation often correlates with academic milestones or high-stakes deadlines. Consider reviewing your logged 
                          <span className="font-medium text-gray-800"> Suggested Action Items</span> on your highly active days to implement micro-interventions before your stress compounding peaks.
                        </>
                      ) : stats.topEmotion.toLowerCase() === 'neutral' ? (
                        <>
                          Your timeline exhibits an exceptionally stable emotional equilibrium, dominated by 
                          <span className="font-bold text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded ml-1 mr-1">Neutral</span> 
                          states. While a flat baseline represents protective resilience, clinical psychology shows that high volume 'neutral' logging can sometimes mask emotional avoidance or burnout exhaustion. 
                          Check your detailed <span className="font-medium text-gray-800">Conversation Transcripts</span> on days with low graph values to see if your inner thoughts align with this emotional plateau.
                        </>
                      ) : ['anger', 'annoyance', 'disappointment', 'sadness', 'fear', 'nervousness'].includes(stats.topEmotion.toLowerCase()) ? (
                        <>
                          A macro-analysis of your timeline flags a recurring cluster of 
                          <span className="font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded ml-1 mr-1 capitalize">{stats.topEmotion}</span> 
                          vibrations. This trajectory indicates that recent life stressors are actively impacting your daily cognitive state. Notice how your 
                          <span className="font-semibold text-[#98AC92]">Emotional Trend Line</span> dips on these days—this is a valuable indicator to step back and deliberately tackle your custom action plans.
                        </>
                      ) : (
                        <>
                          Your emotional architecture is currently reflecting a healthy, positive momentum, spearheaded by consistent 
                          <span className="font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded ml-1 mr-1 capitalize">{stats.topEmotion}</span> 
                          states. This upward trend indicates strong emotional regulation and positive environmental factors. Use these high-wellbeing windows to build buffer habits or tackle demanding final year tasks while your cognitive energy is optimized!
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Journal Notes */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col h-[800px]">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2 text-gray-900">
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                    <h2 className="text-lg font-bold">Journal Notes</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center group">
                      <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        onClick={(e) => {
                          try {
                            if ('showPicker' in HTMLInputElement.prototype) e.currentTarget.showPicker();
                          } catch (err) {
                            console.log("Browser doesn't support showPicker");
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold tracking-wide transition-all duration-300 ${
                        selectedDate 
                          ? "bg-[#FCF4F2] border-[#F5E6E3] text-[#D28C81] shadow-sm" 
                          : "bg-white border-gray-200 text-gray-500 group-hover:border-[#D28C81] group-hover:text-[#D28C81]"
                      }`}>
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span className="uppercase">
                          {selectedDate 
                            ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                            : "Filter Date"}
                        </span>
                      </div>
                    </div>

                    {selectedDate && (
                      <button 
                        onClick={() => setSelectedDate("")} 
                        className="relative z-20 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="Clear date filter"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-y-auto p-4 space-y-3 flex-grow custom-scrollbar">
                  {filteredEntries.length > 0 ? filteredEntries.map((entry) => (
                    <div 
                      key={entry.id} 
                      onClick={() => setSelectedEntry(entry)}
                      className="border border-gray-100 p-4 rounded-2xl hover:border-[#8EACA0] hover:shadow-sm transition-all cursor-pointer bg-white group"
                    >
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center justify-center shrink-0 w-12">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{entry.month}</span>
                          <span className="text-2xl font-serif font-bold text-gray-900">{entry.date}</span>
                        </div>
                        <div className="w-px bg-gray-100 group-hover:bg-gray-200 transition-colors"></div>
                        <div className="flex-grow overflow-hidden">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${entry.moodColor}`}>
                              {entry.mood}
                            </span>
                            <span className="text-xs text-gray-400 font-medium shrink-0 ml-2">{entry.time}</span>
                          </div>
                          <h4 className="font-bold text-gray-900 text-sm mb-1 truncate">{entry.title}</h4>
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{entry.snippet}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 mt-10">
                      {journalEntries.length === 0 ? "No journal entries found. Go chat with Echo!" : "No entries match your search or filter."}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </main>

      {/* THE FULL READING MODAL OVERLAY */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white rounded-t-3xl">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center bg-[#FAF9F6] px-4 py-2 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{selectedEntry.month}</span>
                  <span className="text-xl font-serif font-bold text-gray-900 leading-tight">{selectedEntry.date}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedEntry.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${selectedEntry.moodColor}`}>
                      {selectedEntry.mood}
                    </span>
                    <span className="text-xs font-medium text-gray-400">{selectedEntry.time}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900 outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-6 bg-gray-50 rounded-b-3xl">
              
              {selectedEntry.userText && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Conversation Transcript</h4>
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm max-h-64 overflow-y-auto custom-scrollbar">
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selectedEntry.userText}</p>
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="text-xs font-bold text-[#8EACA0] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Echo's Analysis
                </h4>
                <div className="bg-white p-5 rounded-2xl border border-[#CDE1D4] shadow-sm">
                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{selectedEntry.snippet}</p>
                </div>
              </div>

              {selectedEntry.actions && (
                <div>
                  <h4 className="text-xs font-bold text-[#D9A083] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" /> Action Items
                  </h4>
                  <div className="bg-white p-5 rounded-2xl border border-[#F3E8E0] shadow-sm">
                    {Array.isArray(selectedEntry.actions) ? (
                      <ul className="space-y-4">
                        {selectedEntry.actions.map((action: any, index: number) => {
                          
                          if (typeof action === 'object' && action.title && action.desc) {
                            return (
                              <li key={action.id || index} className="flex items-start gap-3">
                                <button 
                                  onClick={() => toggleActionCompletion(selectedEntry.id, index)}
                                  className="mt-0.5 shrink-0 outline-none group focus:outline-none"
                                >
                                  <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${
                                    action.completed 
                                      ? 'bg-[#D28C81] border-[#D28C81]' 
                                      : 'bg-white border-gray-300 group-hover:border-[#D28C81]'
                                  }`}>
                                    {action.completed && <Check className="w-3 h-3 text-white" />} 
                                  </div>
                                </button>
                                
                                <div>
                                  <span className={`font-bold text-sm block transition-colors ${action.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {action.title}
                                  </span>
                                  <span className={`text-sm leading-relaxed block mt-1 transition-colors ${action.completed ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                    {action.desc}
                                  </span>
                                </div>
                              </li>
                            );
                          }

                          const actionText = typeof action === 'string' ? action : JSON.stringify(action);
                          return (
                            <li key={index} className="list-disc ml-5 text-gray-700 text-sm leading-relaxed">
                              {actionText}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selectedEntry.actions}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* --- NEW: DELETE BUTTON FOOTER --- */}
            <div className="p-4 border-t border-gray-100 flex justify-end bg-white rounded-b-3xl shrink-0">
              <button
                onClick={() => handleDeleteEntry(selectedEntry.id)}
                className="px-4 py-2 flex items-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all shadow-sm outline-none"
              >
                <X className="w-4 h-4" />
                Delete Entry
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}