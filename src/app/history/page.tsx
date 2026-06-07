"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Search, Sparkles, TrendingUp, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/utils/supabaseClient";

// --- GO-EMOTIONS 28-LABEL SCORING ---
// 0 = worst, 100 = best
const emotionScores: Record<string, number> = {
  // High Positive
  admiration: 90, amusement: 85, approval: 80, caring: 85, desire: 80, 
  excitement: 95, gratitude: 90, joy: 95, love: 95, optimism: 85, pride: 85, relief: 80,
  // Neutral / Cognitive
  confusion: 40, curiosity: 60, realization: 60, surprise: 60, neutral: 50,
  // High Negative / Stress
  anger: 10, annoyance: 25, disapproval: 25, disgust: 10, disappointment: 20,
  embarrassment: 20, fear: 15, grief: 5, nervousness: 30, remorse: 15, sadness: 10
};

// Helper function to color-code and translate all 28 HF tags for the UI
const getUIEmotionData = (hfMood: string) => {
  const m = hfMood?.toLowerCase() || 'neutral';
  
  // Group 1: Happy / Positive (Green)
  if (['admiration', 'amusement', 'approval', 'caring', 'desire', 'excitement', 'gratitude', 'joy', 'love', 'optimism', 'pride', 'relief'].includes(m)) {
    return { label: m.charAt(0).toUpperCase() + m.slice(1), color: 'text-green-600 bg-green-50 border-green-200' };
  }
  
  // Group 2: Cognitive / Calm (Blue)
  if (['curiosity', 'realization', 'surprise'].includes(m)) {
    return { label: m.charAt(0).toUpperCase() + m.slice(1), color: 'text-blue-600 bg-blue-50 border-blue-200' };
  }

  // Group 3: Anxious / Tense (Purple)
  if (['confusion', 'embarrassment', 'fear', 'nervousness'].includes(m)) {
    return { label: m.charAt(0).toUpperCase() + m.slice(1), color: 'text-purple-600 bg-purple-50 border-purple-200' };
  }

  // Group 4: Stressed / Negative (Orange)
  if (['anger', 'annoyance', 'disappointment', 'disapproval', 'disgust', 'grief', 'remorse', 'sadness'].includes(m)) {
    return { label: m.charAt(0).toUpperCase() + m.slice(1), color: 'text-orange-600 bg-orange-50 border-orange-200' };
  }

  // Default Fallback (Gray)
  return { label: 'Neutral', color: 'text-gray-600 bg-gray-50 border-gray-200' };
};

export default function ArchivePage() {
  const [timeFilter, setTimeFilter] = useState("Month");
  const [activeMood, setActiveMood] = useState("All");
  
  // --- NEW DYNAMIC STATE ---
  const [isLoading, setIsLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({ avgStress: 0, totalEntries: 0, topEmotion: "N/A" });

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      // 1. Fetch real data from Supabase
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: true }); // Oldest to newest for the chart timeline

      if (error || !data) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
        return;
      }

      // 2. Variables for our math
      const dailyScores: Record<string, { total: number, count: number }> = {};
      const emotionCounts: Record<string, number> = {};
      let globalScoreTotal = 0;
      let validScoreCount = 0;

      // 3. Process the raw data into UI format
      const formattedEntries = data.map((entry) => {
        const dateObj = new Date(entry.created_at);
        
        let emotion = 'Neutral';
        
        // --- THE COMMA SPLITTER ---
        if (entry.emotions) {
          let raw = entry.emotions;
          
          if (typeof raw === 'string') {
             // If it's a comma-separated list like "Joy, Love, Anger"
             // Split it by the comma and grab the first word
             emotion = raw.split(',')[0].trim();
          } else if (Array.isArray(raw) && raw.length > 0) {
             // Just in case some older entries are saved as arrays
             emotion = typeof raw[0] === 'string' ? raw[0] : (raw[0].label || 'Neutral');
          }
        }

        const emotionKey = emotion.toLowerCase(); // Convert "Joy" to "joy"
        
        // Count for "Top Emotion" stat
        emotionCounts[emotionKey] = (emotionCounts[emotionKey] || 0) + 1;

        // Math for the Chart & Avg Stress
        const score = emotionScores[emotionKey] !== undefined ? emotionScores[emotionKey] : 50; 
        const dateKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); 
        
        if (!dailyScores[dateKey]) dailyScores[dateKey] = { total: 0, count: 0 };
        dailyScores[dateKey].total += score;
        dailyScores[dateKey].count += 1;
        
        globalScoreTotal += score;
        validScoreCount += 1;

        // Fetch UI colors/labels using your mapping function
        const uiData = getUIEmotionData(emotionKey);

        return {
          id: entry.id,
          date: dateObj.toLocaleDateString('en-US', { day: '2-digit' }),
          month: dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
          time: dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          mood: uiData.label,
          moodColor: uiData.color,
          title: "Daily Reflection", 
          snippet: entry.narrative || "No summary available..." 
        };
      });

      // 4. Finalize Chart Array (Recharts needs a flat array of objects)
      const finalChartData = Object.keys(dailyScores).map(date => ({
        date,
        value: Math.round(dailyScores[date].total / dailyScores[date].count)
      }));

      // 5. Finalize Stats
      const topEmotionStr = Object.keys(emotionCounts).length > 0 
        ? Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b) 
        : "N/A";
        
      // Convert Well-being score (0-100) to Stress Level (1-10 inverted) for the UI
      const avgWellBeing = validScoreCount > 0 ? (globalScoreTotal / validScoreCount) : 50;
      const stressLevel = ((100 - avgWellBeing) / 10).toFixed(1); 

      // 6. Push to state (Reverse entries so newest is at the top of the feed)
      setChartData(finalChartData);
      setStats({ 
        avgStress: parseFloat(stressLevel), 
        totalEntries: data.length, 
        topEmotion: topEmotionStr.charAt(0).toUpperCase() + topEmotionStr.slice(1) 
      });
      setJournalEntries(formattedEntries.reverse());
      setIsLoading(false);
    }

    fetchData();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-grow flex flex-col h-screen overflow-y-auto relative border-r border-[#E5E2DB]">
        <div className="p-6 lg:p-10 text-gray-800 w-full max-w-7xl mx-auto">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <CalendarIcon className="w-4 h-4" />
                <span>/ Archive</span>
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900 mb-2 font-serif tracking-tight">Historical Archive</h1>
              <p className="text-gray-500 text-base">Your personal growth journey, one thoughtful entry at a time.</p>
            </div>

            <div className="flex bg-white rounded-full p-1 border border-gray-200 shadow-sm">
              {["Week", "Month", "Semester"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                    timeFilter === filter 
                      ? "bg-[#F3E8E0] text-[#B87B6E]" 
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 mb-8 w-full">
            <div className="relative w-full lg:max-w-md shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search your memories..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-[#8EACA0] transition-all text-sm"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto w-full pb-2 lg:pb-0 hide-scrollbar">
              <button onClick={() => setActiveMood("All")} className={`px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all ${activeMood === "All" ? "bg-[#D9A083] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>≡ All Moods</button>
              <button onClick={() => setActiveMood("Happy")} className={`px-5 py-2.5 rounded-2xl border border-green-200 text-green-600 text-sm font-semibold flex items-center gap-2 whitespace-nowrap bg-white hover:bg-green-50 ${activeMood === "Happy" ? "ring-2 ring-green-400" : ""}`}>☺ Happy</button>
              <button onClick={() => setActiveMood("Stressed")} className={`px-5 py-2.5 rounded-2xl border border-orange-200 text-orange-600 text-sm font-semibold flex items-center gap-2 whitespace-nowrap bg-white hover:bg-orange-50 ${activeMood === "Stressed" ? "ring-2 ring-orange-400" : ""}`}>☹ Stressed</button>
              <button onClick={() => setActiveMood("Anxious")} className={`px-5 py-2.5 rounded-2xl border border-purple-200 text-purple-600 text-sm font-semibold flex items-center gap-2 whitespace-nowrap bg-white hover:bg-purple-50 ${activeMood === "Anxious" ? "ring-2 ring-purple-400" : ""}`}>😟 Anxious</button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 w-full">
              <Loader2 className="w-10 h-10 text-[#D28C81] animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Decrypting your emotional history...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* LEFT COLUMN: Charts & Insights */}
              <div className="lg:col-span-2 space-y-6">
                
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Emotional Trends</h2>
                      <p className="text-sm text-gray-500">Observing your balance over time</p>
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
                      <span className="text-3xl font-extrabold text-gray-900">{stats.avgStress}</span>
                      <span className="text-xs font-bold text-gray-500 mb-1">/ 10</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#E5E0D8] rounded-full" style={{ width: `${(stats.avgStress / 10) * 100}%` }}></div>
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

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-5 items-start">
                  <div className="bg-[#FCF4F2] p-3 rounded-2xl shrink-0">
                    <Sparkles className="w-6 h-6 text-[#D28C81]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Weekly Pattern Insight</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      Based on your recent activity, your most dominant feeling is <span className="font-bold text-gray-800">{stats.topEmotion}</span>. Continue logging daily to unlock deeper correlations between your schedule and your mental state.
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
                </div>

                <div className="overflow-y-auto p-4 space-y-3 flex-grow custom-scrollbar">
                  {journalEntries.length > 0 ? journalEntries.map((entry) => (
                    <div key={entry.id} className="border border-gray-100 p-4 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer bg-white group">
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
                    <div className="text-center text-gray-500 mt-10">No journal entries found. Go chat with Echo!</div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}