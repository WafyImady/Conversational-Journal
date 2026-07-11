"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation"; 
import { createClient } from "@/utils/client";
import Sidebar from "@/components/Sidebar";
import { Sparkles, X, Plus, CheckCircle2, Loader2 } from "lucide-react"; 

// Create an interface for our dynamic emotions
interface EmotionSlider {
  id: number;
  name: string;
  intensity: number;
  quote: string;
}

function AnalysisContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryId = searchParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [primaryEmotions, setPrimaryEmotions] = useState<EmotionSlider[]>([]);
  const [backgroundTags, setBackgroundTags] = useState<string[]>([]);
  const [newEmotion, setNewEmotion] = useState("");

  // --- 1. THE FETCH & CALCULATE ENGINE ---
  useEffect(() => {
    const fetchChatData = async () => {
      if (!entryId) return;

      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('chat_transcript')
          .eq('id', entryId)
          .single();

        if (error) throw error;

        const transcript = data.chat_transcript || [];
        const emotionMap: Record<string, { count: number, quote: string }> = {};

        // Tally up the micro-emotions
        transcript.forEach((msg: any) => {
          if (msg.role === 'user' && msg.emotions && Array.isArray(msg.emotions)) {
            msg.emotions.forEach((emo: string) => {
              if (!emotionMap[emo]) {
                emotionMap[emo] = { count: 0, quote: msg.content }; 
              }
              emotionMap[emo].count += 1;
            });
          }
        });

        // Convert tallies into an array and SORT by frequency
        const allDetectedEmotions = Object.keys(emotionMap)
          .map((emoName, index) => {
            const data = emotionMap[emoName];
            const calculatedIntensity = Math.min(60 + ((data.count - 1) * 15), 95);
            return {
              id: index + 1,
              name: emoName.charAt(0).toUpperCase() + emoName.slice(1).toLowerCase(),
              intensity: calculatedIntensity,
              quote: data.quote,
              count: data.count 
            };
          })
          .sort((a, b) => b.count - a.count);

        // Split into Top 3 Sliders and Background Tags
        const top3Sliders = allDetectedEmotions.slice(0, 3);
        const leftoverTags = allDetectedEmotions.slice(3).map(e => e.name);

        setPrimaryEmotions(top3Sliders);
        setBackgroundTags(leftoverTags);
      } catch (error) {
        console.error("Failed to load transcript:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatData();
  }, [entryId, supabase]);

  // --- 2. THE SWAPPING LOGIC (Promote/Demote) ---
  const handleSliderChange = (id: number, newValue: number) => {
    setPrimaryEmotions(primaryEmotions.map(emp => 
      emp.id === id ? { ...emp, intensity: newValue } : emp
    ));
  };

  const demoteToTag = (emotionId: number, emotionName: string) => {
    setPrimaryEmotions(prev => prev.filter(e => e.id !== emotionId));
    if (!backgroundTags.includes(emotionName)) {
      setBackgroundTags(prev => [emotionName, ...prev]);
    }
  };

  const promoteToSlider = (emotionName: string) => {
    // 1. Force formatting
    const formatted = emotionName.charAt(0).toUpperCase() + emotionName.slice(1).toLowerCase();
    
    // 2. Remove it from background tags
    setBackgroundTags(prev => prev.filter(e => e.toLowerCase() !== emotionName.toLowerCase()));
    
    // 3. Only add it to primary if it doesn't already exist!
    setPrimaryEmotions(prev => {
      if (prev.some(e => e.name.toLowerCase() === formatted.toLowerCase())) {
        return prev; // Ignore it, it's already a slider
      }
      return [
        { id: Date.now(), name: formatted, intensity: 50, quote: "Promoted from background" },
        ...prev
      ];
    });
  };

  const removeBackgroundTag = (tagToRemove: string) => {
    setBackgroundTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleManualAdd = () => {
    if (newEmotion.trim()) {
      const formatted = newEmotion.trim().charAt(0).toUpperCase() + newEmotion.trim().slice(1).toLowerCase();
      
      // Prevent duplicates
      if (primaryEmotions.some(e => e.name.toLowerCase() === formatted.toLowerCase())) {
        setNewEmotion("");
        return;
      }

      // Instantly make it a slider!
      setPrimaryEmotions(prev => [
        { id: Date.now(), name: formatted, intensity: 60, quote: "Added manually by you" },
        ...prev
      ]);
      setNewEmotion("");
    }
  };

  // 3. THE CORRECTED SAVE AND GENERATE FUNCTION 
  const handleConfirmAnalysis = async () => {
    if (!entryId) return;
    setIsSaving(true);

    try {
      const validSliders = primaryEmotions
        .filter(e => e.intensity > 20)
        .map(e => ({ name: e.name, intensity: e.intensity })); 
      
      const finalEmotionData = { primary: validSliders, background: backgroundTags };

      // FETCH TRANSCRIPT
      const { data: entryData, error: fetchError } = await supabase
        .from('journal_entries')
        .select('chat_transcript')
        .eq('id', entryId)
        .single();
        
      // SAFE CHECK
      if (fetchError || !entryData) {
        throw new Error(fetchError?.message || "Journal entry not found.");
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      // CALL API
      const apiResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
          transcript: entryData.chat_transcript, 
          primaryEmotions: validSliders.map(e => e.name).join(", "), 
          backgroundEmotions: backgroundTags.join(", ") 
        })
      });

      const geminiResult = await apiResponse.json();
      if (geminiResult.error) throw new Error(geminiResult.error);

      // SAVE TO SUPABASE
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update({ 
          emotions: finalEmotionData, 
          narrative: geminiResult.narrative, 
          action_items: geminiResult.actions, 
          themes: geminiResult.themes, 
          status: 'reviewing' 
        })
        .eq('id', entryId);

      if (updateError) throw updateError;

      router.push(`/insights?id=${entryId}`);

    } catch (error) {
      console.error("Failed to save analysis:", error);
      alert("Error saving analysis. Please check console.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- 4. RENDER UI ---
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6]">
        <div className="flex flex-col items-center gap-4 text-[#8EACA0]">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-sm font-semibold tracking-wider uppercase">
            Analyzing emotional trends...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 text-gray-800 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button className="text-sm text-gray-500 hover:text-gray-800 mb-3 flex items-center" onClick={() => router.push("/")}>
          <span className="mr-2">‹</span> Back to Journal
        </button>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Entry Analysis</h1>
            <p className="text-gray-500 text-sm">
              Take a gentle moment to review and adjust the sliders to match your true feelings.
            </p>
          </div>
          <div className="text-right bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Date</p>
            <p className="font-semibold text-gray-900 text-sm">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* LEFT COLUMN: Sliders and Tags */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 min-h-[500px]">
            <div className="flex items-center mb-6">
              <div className="bg-[#FAF9F6] p-2 rounded-xl mr-3 border border-gray-100">
                <Sparkles className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Identified Emotions</h2>
            </div>

            {/* SLIDERS */}
            <div className="space-y-4">
              {primaryEmotions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No intense emotions were detected. Feel free to add your own manually!
                </div>
              ) : (
                primaryEmotions.map((emotion) => (
                  <div key={emotion.id} className="relative bg-[#FAF9F6] p-5 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-4">
                        <span className="px-4 py-1 bg-[#F0EBE1] text-gray-800 font-semibold rounded-full text-sm">
                          {emotion.name}
                        </span>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          {emotion.intensity > 70 ? "High" : emotion.intensity > 40 ? "Medium" : "Low"} Intensity
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          className="text-gray-400 hover:text-red-500 transition-colors" 
                          onClick={() => demoteToTag(emotion.id, emotion.name)}
                          title="Remove from primary"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <span className="font-bold text-gray-900 w-12 text-right text-lg">{emotion.intensity}%</span>
                      </div>
                    </div>
                    
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={emotion.intensity}
                      onChange={(e) => handleSliderChange(emotion.id, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8EACA0]"
                    />
                    
                    {emotion.quote && (
                      <p className="mt-3 text-gray-500 italic text-sm leading-relaxed">"{emotion.quote}"</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* BACKGROUND TAGS */}
            {backgroundTags.length > 0 && (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Other Detected Frequencies</p>
                <div className="flex flex-wrap gap-2">
                  {backgroundTags.map((tag, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center bg-white border border-gray-200 rounded-full shadow-sm overflow-hidden"
                    >
                      {/* Promote Button */}
                      <button
                        onClick={() => promoteToSlider(tag)}
                        className="text-gray-600 hover:bg-gray-50 hover:text-[#8EACA0] px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Promote to primary emotion"
                      >
                        <Plus className="w-3 h-3" /> {tag}
                      </button>
                      
                      {/* Divider */}
                      <div className="w-px h-4 bg-gray-200"></div>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => removeBackgroundTag(tag)}
                        className="px-2 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Discard this emotion"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Human Check / Custom Adder */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-[#E8F0EA] p-2 rounded-xl text-[#5B8266]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Human Check</h3>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-gray-500 bg-[#FAF9F6] border border-gray-100 px-3 py-1.5 rounded-full">
                FEEDBACK
              </span>
            </div>

            <h4 className="font-bold text-gray-900 mb-1">Your Thoughts</h4>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              If the AI missed any nuances, tell us directly. Typing an emotion here will instantly add it to your sliders.
            </p>

            <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-gray-100">
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  placeholder="Type an emotion..." 
                  className="flex-grow bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8EACA0] text-gray-700"
                  value={newEmotion}
                  onChange={(e) => setNewEmotion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualAdd();
                  }}
                />
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={handleManualAdd}
                  className="bg-[#8EACA0] hover:bg-[#7D9A8F] text-white px-4 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
                >
                  Add <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 mb-4 flex justify-end items-center gap-6">
        <button 
          onClick={() => router.push("/")}
          className="text-gray-500 font-semibold text-sm hover:text-gray-800 transition-colors"
        >
          Discard Changes
        </button>
        <button 
          onClick={handleConfirmAnalysis}
          disabled={isSaving}
          className="bg-[#8EACA0] hover:bg-[#7D9A8F] disabled:bg-gray-400 text-white px-8 py-3 rounded-full font-semibold shadow-md transition-colors flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Confirm Analysis
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />
      <main className="flex-grow flex flex-col h-screen overflow-y-auto relative border-r border-[#E5E2DB]">
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 text-[#8EACA0] animate-spin" /></div>}>
          <AnalysisContent />
        </Suspense>
      </main>
    </div>
  );
}