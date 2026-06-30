"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar"; 
import { createClient } from "@/utils/client";
import { BookOpen, CheckCircle2, Plus, RefreshCw, CheckCircle, Edit2, Loader2 } from "lucide-react";

interface ActionItem {
  id: number;
  title: string;
  desc: string;
  completed: boolean;
}

function InsightsContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryId = searchParams.get("id");

  const [narrative, setNarrative] = useState("");
  const [actions, setActions] = useState<ActionItem[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- NEW: STATES FOR ADDING CUSTOM ACTIONS ---
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionDesc, setNewActionDesc] = useState("");

  // --- THE AI GENERATION ENGINE ---
  const generateInsights = async () => {
    if (!entryId) return;
    setIsGenerating(true);

    try {
      const { data: entryData, error: dbError } = await supabase
        .from('journal_entries')
        .select('chat_transcript, emotions')
        .eq('id', entryId)
        .single();

      if (dbError) throw dbError;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transcript: entryData.chat_transcript,
          emotions: entryData.emotions 
        }),
      });

      const aiData = await response.json();
      
      if (aiData.error) throw new Error(aiData.error);

      setNarrative(aiData.narrative);
      setActions(aiData.actions);

    } catch (error) {
      console.error("Failed to generate insights:", error);
      setNarrative("We encountered an error while synthesizing your journal entry. Please try refreshing.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateInsights();
  }, [entryId]);

  const toggleAction = (id: number) => {
    setActions(actions.map(action => 
      action.id === id ? { ...action, completed: !action.completed } : action
    ));
  };

  // --- NEW: HANDLER TO SAVE CUSTOM ACTION ---
  const handleAddAction = () => {
    if (!newActionTitle.trim()) return; // Prevent empty actions

    const newCustomAction: ActionItem = {
      id: Date.now(), // Generate a unique ID for the new item
      title: newActionTitle.trim(),
      desc: newActionDesc.trim(),
      completed: false
    };

    // Add to our list
    setActions([...actions, newCustomAction]);
    
    // Reset the form
    setNewActionTitle("");
    setNewActionDesc("");
    setIsAddingAction(false);
  };

  // --- THE FINAL SAVE ENGINE ---
  const handleFinalize = async () => {
    if (!entryId) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({ 
          narrative: narrative,
          action_items: actions, // This now includes your custom actions!
          status: 'completed',
          completed_at: new Date().toISOString() 
        })
        .eq('id', entryId);

      if (error) throw error;

      router.push("/");

    } catch (error) {
      console.error("Failed to save final entry:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6]">
        <div className="flex flex-col items-center gap-4 text-[#8EACA0]">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-sm font-semibold tracking-wider uppercase">Synthesizing your thoughts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 text-gray-800 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-[#D28C81] uppercase mb-3">
          <span className="w-3 h-3 border border-[#D28C81] rounded flex items-center justify-center text-[8px]">📅</span>
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2 font-serif tracking-tight">Review Your Entry</h1>
            <p className="text-gray-500 text-sm">
              Take a moment to read through your synthesized narrative and review the <br/>suggested actionable steps for your wellbeing.
            </p>
          </div>
          <div className="bg-[#FCF4F2] text-[#D28C81] px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border border-[#F5E6E3]">
            <span className="w-1.5 h-1.5 bg-[#D28C81] rounded-full"></span>
            Draft Generated
          </div>
        </div>
      </div>

      <hr className="border-t-2 border-dashed border-[#F0EBE1] mb-8" />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        
        {/* LEFT COLUMN: Narrative */}
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-gray-900">
              <BookOpen className="w-5 h-5 text-[#8EACA0]" />
              <h2 className="text-xl font-bold font-serif">Structured Narrative</h2>
            </div>
            <button className="text-gray-400 hover:text-[#D28C81] transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative">
            <div className="absolute left-8 top-8 bottom-8 w-px bg-[#FFF0ED]"></div>
            <div className="pl-6 text-gray-700 leading-relaxed font-serif text-lg whitespace-pre-wrap">
              <p className="first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-gray-900">
                {narrative}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Actionable Steps */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 text-gray-900 mb-4">
            <CheckCircle2 className="w-5 h-5 text-[#8EACA0]" />
            <h2 className="text-xl font-bold font-serif">Suggested Actions</h2>
          </div>

          <div className="space-y-4 mb-6">
            {actions.map((action) => (
              <div 
                key={action.id} 
                onClick={() => toggleAction(action.id)}
                className={`bg-white p-5 rounded-2xl shadow-sm border cursor-pointer transition-all flex gap-4 ${
                  action.completed ? "border-[#8EACA0] bg-[#F7FAF8]" : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="pt-0.5">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                    action.completed ? "bg-[#8EACA0] border-[#8EACA0] text-white" : "border-gray-300 bg-gray-50"
                  }`}>
                    {action.completed && <CheckCircle className="w-3.5 h-3.5" />}
                  </div>
                </div>
                <div>
                  <h4 className={`font-bold text-sm mb-1 ${action.completed ? "text-gray-900 line-through decoration-gray-400" : "text-gray-900"}`}>
                    {action.title}
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{action.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* --- NEW: INTERACTIVE ADD ACTION UI --- */}
          {isAddingAction ? (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#D28C81] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
              <input
                autoFocus
                type="text"
                placeholder="Action Title (e.g., Drink water)"
                className="w-full font-bold text-sm text-gray-900 focus:outline-none placeholder-gray-400 bg-transparent"
                value={newActionTitle}
                onChange={(e) => setNewActionTitle(e.target.value)}
              />
              <textarea
                placeholder="Brief description of how or when you'll do this..."
                className="w-full text-xs text-gray-600 focus:outline-none resize-none placeholder-gray-400 bg-transparent custom-scrollbar"
                rows={2}
                value={newActionDesc}
                onChange={(e) => setNewActionDesc(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => {
                    setIsAddingAction(false);
                    setNewActionTitle("");
                    setNewActionDesc("");
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddAction}
                  disabled={!newActionTitle.trim()}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#D28C81] text-white rounded-lg hover:bg-[#C17A6F] disabled:bg-gray-300 transition-colors"
                >
                  Save Action
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsAddingAction(true)}
              className="w-full py-4 border-2 border-dashed border-[#F5E6E3] rounded-2xl text-[#D28C81] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#FCF4F2] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Custom Action
            </button>
          )}

        </div>
      </div>

      <hr className="border-t-2 border-dashed border-[#F0EBE1] my-8" />

      {/* Bottom Action Bar */}
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={generateInsights}
          className="px-6 py-3 border border-[#F5E6E3] text-[#D28C81] font-semibold text-sm rounded-full flex items-center gap-2 hover:bg-[#FCF4F2] transition-colors bg-white"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
          Regenerate Narrative
        </button>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={handleFinalize}
            disabled={isSaving}
            className="px-8 py-3 bg-[#D28C81] hover:bg-[#C17A6F] disabled:bg-gray-400 text-white font-semibold text-sm rounded-full flex items-center gap-2 shadow-sm transition-colors"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Finalize & Save Entry
          </button>
        </div>
      </div>

    </div>
  );
}

export default function InsightsPage() {
  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />
      <main className="flex-grow flex flex-col h-screen overflow-y-auto relative border-r border-[#E5E2DB]">
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 text-[#8EACA0] animate-spin" /></div>}>
          <InsightsContent />
        </Suspense>
      </main>
    </div>
  );
}