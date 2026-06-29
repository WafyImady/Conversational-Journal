"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/client";
import { Lightbulb, Smile, Cloud, Sparkles, Frown, Zap, Heart, Meh } from "lucide-react"; 

const getEmotionStyle = (emotionName: string) => {
  const name = emotionName.toLowerCase();
  if (["joy", "happy", "contentment", "admiration"].includes(name)) return { icon: Smile, color: "text-yellow-500", bg: "bg-[#FEFCED]", border: "border-[#F5EED0]", textBg: "bg-yellow-100/50", textCol: "text-yellow-600" };
  if (["anxiety", "fear", "overwhelmed", "nervous"].includes(name)) return { icon: Zap, color: "text-purple-500", bg: "bg-[#F9F5FF]", border: "border-[#E9D7FE]", textBg: "bg-purple-100/50", textCol: "text-purple-600" };
  if (["sadness", "grief", "disappointment"].includes(name)) return { icon: Cloud, color: "text-blue-500", bg: "bg-[#F1F6FF]", border: "border-[#DCE6F5]", textBg: "bg-blue-100/50", textCol: "text-blue-600" };
  if (["anger", "frustration", "annoyed"].includes(name)) return { icon: Frown, color: "text-red-500", bg: "bg-[#FEF3F2]", border: "border-[#FECDCA]", textBg: "bg-red-100/50", textCol: "text-red-600" };
  if (["love", "gratitude", "caring"].includes(name)) return { icon: Heart, color: "text-pink-500", bg: "bg-[#FDF2FA]", border: "border-[#FCCCE7]", textBg: "bg-pink-100/50", textCol: "text-pink-600" };
  return { icon: Meh, color: "text-gray-500", bg: "bg-[#F4F4F5]", border: "border-[#E4E4E7]", textBg: "bg-gray-200/50", textCol: "text-gray-600" };
};

// A basic NLP "Stop Words" list to filter out boring words
const STOP_WORDS = new Set(["the", "and", "that", "this", "with", "from", "your", "have", "more", "will", "would", "could", "should", "what", "when", "where", "they", "them", "their", "about", "which", "just", "like", "because", "really", "very", "much", "some", "know", "think", "feel", "feeling", "time", "been", "were"]);

export default function RightSidebar() {
  const supabase = createClient();
  const [tips, setTips] = useState<{ tag: string; text: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [primaryVibe, setPrimaryVibe] = useState<any>(null);
  const [secondaryVibe, setSecondaryVibe] = useState<any>(null);
  const [themes, setThemes] = useState<string[]>([]); // <-- NEW STATE FOR THEMES
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hour = new Date().getHours();
    let timeTip = { tag: "Morning", text: "What is your primary intention for today?" };
    if (hour >= 12 && hour < 17) timeTip = { tag: "Afternoon", text: "Take a moment to reset. How is your energy right now?" };
    else if (hour >= 17) timeTip = { tag: "Evening", text: "What made you smile today, even if just for a moment?" };
    
    setTips([
      timeTip,
      { tag: "Mindfulness", text: "What is one small win you had today?" },
      { tag: "Growth", text: "Describe a challenge you overcame recently." },
      { tag: "Focus", text: "What is one thing you can let go of today?" }
    ]);
  }, []);

  useEffect(() => {
    if (tips.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tips.length);
    }, 10000); 
    return () => clearInterval(interval); 
  }, [tips.length, currentIndex]); 

  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        setIsLoading(true); // 1. Start the spinner

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        // 2. If no user, safely exit. The finally block will kill the spinner.
        if (authError || !user) return; 

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: entries, error: dbError } = await supabase
          .from('journal_entries')
          .select('chat_transcript')
          .eq('user_id', user.id)
          .gte('created_at', sevenDaysAgo.toISOString());

        // 3. Catch database errors immediately
        if (dbError) throw dbError; 

        // 4. If no entries, safely exit. The finally block will kill the spinner.
        if (!entries || entries.length === 0) return; 

        const emotionCounts: Record<string, number> = {};
        let totalEmotions = 0;
        let allUserText = ""; 

        entries.forEach(entry => {
          if (Array.isArray(entry.chat_transcript)) {
            entry.chat_transcript.forEach((msg: any) => {
              if (msg.role === 'user') {
                if (Array.isArray(msg.emotions)) {
                  msg.emotions.forEach((rawEmotion: any) => {
                    // 1. Safely extract the string, no matter how messy the database is!
                    let emotionStr = "";
                    
                    if (typeof rawEmotion === "string") {
                      emotionStr = rawEmotion; // It's a clean string: "joy"
                    } else if (Array.isArray(rawEmotion) && typeof rawEmotion[0] === "string") {
                      emotionStr = rawEmotion[0]; // It's a nested array: ["joy"]
                    } else if (rawEmotion && typeof rawEmotion.label === "string") {
                      emotionStr = rawEmotion.label; // It's an old HuggingFace object: { label: "joy" }
                    }

                    // 2. Now that we guarantee it's a string, we can safely use toLowerCase()
                    if (emotionStr && emotionStr.toLowerCase() !== 'neutral') {
                      const cleanEmotion = emotionStr.toLowerCase();
                      emotionCounts[cleanEmotion] = (emotionCounts[cleanEmotion] || 0) + 1;
                      totalEmotions++;
                    }
                  });
                }
                if (msg.content) {
                  allUserText += " " + msg.content.toLowerCase();
                }
              }
            });
          }
        });

        if (totalEmotions > 0) {
          const sortedEmotions = Object.entries(emotionCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({
              name,
              percentage: Math.round((count / totalEmotions) * 100)
            }));

          if (sortedEmotions.length > 0) setPrimaryVibe({ ...sortedEmotions[0], style: getEmotionStyle(sortedEmotions[0].name) });
          if (sortedEmotions.length > 1) setSecondaryVibe({ ...sortedEmotions[1], style: getEmotionStyle(sortedEmotions[1].name) });
        }

        const rawWords = allUserText.match(/\b[a-z]{4,}\b/g) || [];
        const wordCounts: Record<string, number> = {};

        rawWords.forEach(word => {
          if (!STOP_WORDS.has(word)) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          }
        });

        const extractedThemes = Object.entries(wordCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([word]) => `#${word.charAt(0).toUpperCase() + word.slice(1)}`); 

        setThemes(extractedThemes);

      } catch (error) {
        console.error("Failed to load weekly trends:", error);
      } finally {
        // 5. THE KILL SWITCH: Runs no matter what, stopping the infinite spin!
        setIsLoading(false);
      }
    };

    fetchWeeklyData();
  }, [supabase]);

  return (
    <aside className="w-96 min-h-screen bg-[#FAF9F6] p-8 border-l border-[#E5E2DB] flex flex-col gap-6 overflow-y-auto hidden lg:flex">
      
      {/* 1. The Interactive Reflection Carousel */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E2DB] shadow-sm relative min-h-[160px] flex flex-col justify-between transition-all duration-500 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#A3A097] tracking-wider uppercase">
            <Lightbulb className="w-3 h-3 text-[#E2AD9A]" />
            Reflection Tip
          </div>
          <span className="bg-[#F8F6F2] text-[#A3A097] text-[10px] px-3 py-1 rounded-full font-semibold transition-all duration-300">
            {tips[currentIndex]?.tag || "Loading"}
          </span>
        </div>
        <p key={currentIndex} className="text-center text-[#2A2A2A] font-medium leading-relaxed italic px-2 animate-in fade-in duration-700">
          "{tips[currentIndex]?.text || "Take a deep breath..."}"
        </p>
        <div className="flex justify-center gap-1.5 mt-6">
          {tips.map((_, idx) => (
            <button 
              key={idx} 
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer hover:bg-[#8EACA0]/60 ${
                idx === currentIndex ? "w-4 bg-[#8EACA0]" : "w-1.5 bg-[#E5E2DB]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 2. LIVE Weekly Trends Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E2DB] shadow-sm shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-[#2A2A2A]">Weekly Trends</h3>
          <span className="text-[10px] uppercase font-bold text-[#A3A097] cursor-pointer hover:text-[#6A7F5D] transition-colors">
            View Analytics
          </span>
        </div>
        
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-[#E2AD9A] border-t-transparent rounded-full animate-spin"></div></div>
          ) : !primaryVibe ? (
             <p className="text-xs text-center text-[#A3A097] py-2">Complete your first reflection to unlock your emotional insights! ✨</p>
          ) : (
            <>
              <div className={`w-full ${primaryVibe.style.bg} p-5 rounded-2xl border ${primaryVibe.style.border} flex items-center justify-between transition-colors`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-full shadow-sm">
                    <primaryVibe.style.icon className={`w-5 h-5 ${primaryVibe.style.color}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A097]">Primary Vibe</span>
                    <span className="text-sm font-bold text-[#2A2A2A] capitalize">{primaryVibe.name}</span>
                  </div>
                </div>
                <span className={`text-xs font-semibold ${primaryVibe.style.textCol} ${primaryVibe.style.textBg} px-2 py-1 rounded-md`}>{primaryVibe.percentage}%</span>
              </div>

              {secondaryVibe && (
                <div className={`w-full ${secondaryVibe.style.bg} p-5 rounded-2xl border ${secondaryVibe.style.border} flex items-center justify-between transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full shadow-sm">
                      <secondaryVibe.style.icon className={`w-5 h-5 ${secondaryVibe.style.color}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A097]">Secondary Vibe</span>
                      <span className="text-sm font-bold text-[#2A2A2A] capitalize">{secondaryVibe.name}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold ${secondaryVibe.style.textCol} ${secondaryVibe.style.textBg} px-2 py-1 rounded-md`}>{secondaryVibe.percentage}%</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. LIVE Echo's Observations */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E2DB] shadow-sm flex-grow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-[#2A2A2A] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#8EACA0]" />
            Echo's Observations
          </h3>
        </div>
        <p className="text-xs text-[#A3A097] mb-4 leading-relaxed">
          Recurring themes detected in your recent entries.
        </p>
        
        {isLoading ? (
          <div className="flex justify-center py-2"><div className="w-4 h-4 border-2 border-[#E2AD9A] border-t-transparent rounded-full animate-spin"></div></div>
        ) : themes.length === 0 ? (
          <p className="text-xs text-center text-[#A3A097] py-2 italic">Write more entries to generate themes.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {themes.map((theme, index) => {
              // Give them slightly different colors based on their rank (1st, 2nd, 3rd)
              const styles = [
                "bg-[#EAF2ED] text-[#5A7A62] border-[#CDE1D4]", 
                "bg-[#F0EBE1] text-[#8B8674] border-[#E5E2DB]", 
                "bg-[#FCF4F2] text-[#D28C81] border-[#F5E6E3]"  
              ];
              return (
                <span key={index} className={`px-3 py-1.5 text-[11px] font-bold tracking-wide rounded-lg border ${styles[index]}`}>
                  {theme}
                </span>
              );
            })}
          </div>
        )}
      </div>

    </aside>
  );
}