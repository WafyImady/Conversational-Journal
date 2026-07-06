"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation"; 
import { createClient } from "@/utils/client";
import Sidebar from "@/components/Sidebar";
import { Sparkles, X, Plus, Mic, CheckCircle2, Loader2 } from "lucide-react"; 

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
  const entryId = searchParams.get("id"); // Grab the ID from the URL!

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [emotions, setEmotions] = useState<EmotionSlider[]>([]);
  const [newEmotion, setNewEmotion] = useState("");
  const [addedEmotions, setAddedEmotions] = useState<string[]>([]);

  // --- THE FETCH & CALCULATE ENGINE ---
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
        
        // 1. Map to track how many times an emotion appears
        const emotionMap: Record<string, { count: number, quote: string }> = {};

        // 2. Loop through the chat and tally up the micro-emotions
        transcript.forEach((msg: any) => {
          if (msg.role === 'user' && msg.emotions && Array.isArray(msg.emotions)) {
            msg.emotions.forEach((emo: string) => {
              if (!emotionMap[emo]) {
                // Save the first time they felt it as the quote
                emotionMap[emo] = { count: 0, quote: msg.content }; 
              }
              emotionMap[emo].count += 1;
            });
          }
        });

        // 3. Convert the tallies into slider data
        const dynamicSliders = Object.keys(emotionMap).map((emoName, index) => {
          const data = emotionMap[emoName];
          // Base intensity is 60%. Add 15% for every extra time they felt it, capped at 95%
          const calculatedIntensity = Math.min(60 + ((data.count - 1) * 15), 95);
          
          return {
            id: index + 1,
            name: emoName,
            intensity: calculatedIntensity,
            quote: data.quote
          };
        });

        setEmotions(dynamicSliders);
      } catch (error) {
        console.error("Failed to load transcript:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatData();
  }, [entryId]);

  const handleSliderChange = (id: number, newValue: number) => {
    setEmotions(emotions.map(emp => 
      emp.id === id ? { ...emp, intensity: newValue } : emp
    ));
  };

  const handleConfirmAnalysis = async () => {
    if (!entryId) return;
    setIsSaving(true);

    try {
      // 1. Format the slider and manually added emotions
      const validSliderEmotions = emotions
        .filter(e => e.intensity > 20)
        .map(e => ({ name: e.name, intensity: e.intensity })); 

      const formattedAddedEmotions = addedEmotions.map(name => ({ name, intensity: 50 }));
      const finalEmotionData = [...validSliderEmotions, ...formattedAddedEmotions];
      
      // We will need a string of just the emotion names to pass to Gemini
      const emotionNamesString = finalEmotionData.map(e => e.name).join(", ");

      // 2. Fetch the transcript so we can send it to Gemini
      const { data: entryData, error: fetchError } = await supabase
        .from('journal_entries')
        .select('chat_transcript')
        .eq('id', entryId)
        .single();
        
      if (fetchError) throw fetchError;

      // 3. ✨ NEW: Call your Gemini API to generate Narrative, Actions & THEMES! ✨
      const { data: { session } } = await supabase.auth.getSession();
      
      const apiResponse = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          transcript: entryData.chat_transcript, 
          emotions: emotionNamesString 
        })
      });

      const geminiResult = await apiResponse.json();
      
      if (geminiResult.error) {
        throw new Error(geminiResult.error);
      }

      // 4. Save EVERYTHING to Supabase at once!
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update({ 
          emotions: finalEmotionData,
          narrative: geminiResult.narrative, 
          action_items: geminiResult.actions, 
          themes: geminiResult.themes, // <-- HERE ARE YOUR THEMES!
          status: 'reviewing' 
        })
        .eq('id', entryId);

      if (updateError) throw updateError;

      // 5. Finally, move to the insights page to view the generated content!
      router.push(`/insights?id=${entryId}`);

    } catch (error) {
      console.error("Failed to save analysis:", error);
      alert("Error saving analysis. Please check console.");
    } finally {
      setIsSaving(false);
    }
  };

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
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 min-h-[500px]">
            <div className="flex items-center mb-6">
              <div className="bg-[#FAF9F6] p-2 rounded-xl mr-3 border border-gray-100">
                <Sparkles className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Identified Emotions</h2>
            </div>

            <div className="space-y-4">
              {emotions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No intense emotions were detected during this session. <br/> Feel free to add your own manually!
                </div>
              ) : (
                emotions.map((emotion) => (
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
                        <button className="text-gray-400 hover:text-gray-600" onClick={() => handleSliderChange(emotion.id, 0)}><X className="w-4 h-4" /></button>
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
          </div>
        </div>

        {/* RIGHT COLUMN: Human Check */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 h-full">
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
              If the AI missed any nuances, tell us directly. Your input helps us learn.
            </p>

            <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-gray-100 mb-6">
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  placeholder="Type an emotion..." 
                  className="flex-grow bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8EACA0] text-gray-700"
                  value={newEmotion}
                  onChange={(e) => setNewEmotion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newEmotion.trim()) {
                      setAddedEmotions([...addedEmotions, newEmotion.trim()]);
                      setNewEmotion("");
                    }
                  }}
                />
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => {
                    if (newEmotion.trim()) {
                      setAddedEmotions([...addedEmotions, newEmotion.trim()]);
                      setNewEmotion("");
                    }
                  }}
                  className="bg-[#8EACA0] hover:bg-[#7D9A8F] text-white px-4 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
                >
                  Add <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Added Emotions</p>
              <div className="flex flex-wrap gap-2">
                {addedEmotions.map((em, idx) => (
                  <span key={idx} className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm">
                    {em}
                    <button 
                      onClick={() => setAddedEmotions(addedEmotions.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
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
        {/* Suspense boundary is required in Next.js when using useSearchParams */}
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 text-[#8EACA0] animate-spin" /></div>}>
          <AnalysisContent />
        </Suspense>
      </main>
    </div>
  );
}