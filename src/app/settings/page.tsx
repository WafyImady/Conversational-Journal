"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/utils/client"; // Your current working import!
import { useRouter } from "next/navigation"; // 1. Added router import
import { BookOpen, Clock, SlidersHorizontal, User, CheckCircle2, Circle, Bell, Mail, Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter(); // Initialize router

  // 2. Store the real user's ID once we fetch it
  const [userId, setUserId] = useState<string | null>(null); 

  // Interactive States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [narrativeStyle, setNarrativeStyle] = useState("Analytical");
  const [activeDays, setActiveDays] = useState(["M", "T", "W", "T", "F"]);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [responseLength, setResponseLength] = useState("Moderate");

  // 3. FETCH REAL USER & SAVED SETTINGS ON LOAD
  useEffect(() => {
    async function loadUserAndSettings() {
      // Step A: Get the currently logged-in user securely
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      // Step B: If no user is logged in, redirect to login page
      if (authError || !user) {
        console.error("Not logged in!");
        router.push("/login"); 
        return;
      }

      // Step C: Save their real ID to state
      setUserId(user.id);

      // Step D: Fetch settings using their real ID
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setNarrativeStyle(data.narrative_style);
        setResponseLength(data.response_length);
        setPushEnabled(data.push_enabled);
        setEmailEnabled(data.email_enabled);
      }
      setIsLoading(false);
    }

    // Call the async function inside the effect
    loadUserAndSettings();
  }, [router, supabase]); // Dependencies

  // 4. PUSH CHANGES TO DATABASE
  const handleSave = async () => {
    if (!userId) return; // Safety check: don't save if we don't have an ID!

    setIsSaving(true);
    
    const { error } = await supabase
      .from('user_settings')
      .upsert({ 
        user_id: userId, // <-- Using the real ID state here!
        narrative_style: narrativeStyle,
        response_length: responseLength,
        push_enabled: pushEnabled,
        email_enabled: emailEnabled,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }); // Upsert means "Update if exists, Create if new"

    setIsSaving(false);
    
    if (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save preferences.");
    } else {
      console.log("Settings successfully saved!");
    }
  };

  const daysOfWeek = [
    { id: "S1", label: "S" }, { id: "M", label: "M" }, { id: "T1", label: "T" },
    { id: "W", label: "W" }, { id: "T2", label: "T" }, { id: "F", label: "F" }, { id: "S2", label: "S" }
  ];

  const toggleDay = (dayId: string) => {
    setActiveDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#FAF9F6]"><Loader2 className="w-8 h-8 animate-spin text-[#5A7A62]" /></div>;

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-grow h-screen overflow-y-auto relative flex flex-col items-center">
        <div className="p-6 lg:p-10 w-full max-w-4xl flex-grow">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 font-serif tracking-tight">Journaling Preferences</h1>
            <p className="text-gray-500 text-sm">Customize how your AI companion interacts with your daily entries.</p>
          </div>

          <div className="space-y-6 pb-20">
            
            {/* PROFILE CARD */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-5 w-full md:w-auto">
                <div className="w-20 h-20 rounded-2xl bg-[#F0D8C3] flex items-center justify-center relative shrink-0">
                  <User className="w-10 h-10 text-white opacity-80" />
                  <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full border border-gray-100">
                    <div className="bg-gray-100 p-1.5 rounded-full"><BookOpen className="w-3 h-3 text-gray-500" /></div>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Alex Thompson</h2>
                  <p className="text-sm text-gray-500 mb-2">alex.thompson@echojournal.com</p>
                  <span className="text-[10px] font-bold tracking-wider text-[#5A7A62] bg-[#EAF2ED] px-3 py-1 rounded-full uppercase">Premium Member</span>
                </div>
              </div>
            </div>

            {/* NARRATIVE STYLE CARD */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#EAF2ED] p-2.5 rounded-xl"><BookOpen className="w-5 h-5 text-[#5A7A62]" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Narrative Style</h3>
                  <p className="text-sm text-gray-500">Choose the voice your journal uses to speak back to you.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: "Bulleted", desc: "Concise lists. Great for quick reviews and action items." },
                  { title: "Poetic", desc: "Metaphorical and warm. Focuses on feelings and imagery." },
                  { title: "Analytical", desc: "Reflective and deep. Identifies patterns in your mood." }
                ].map((style) => (
                  <button
                    key={style.title}
                    onClick={() => setNarrativeStyle(style.title)}
                    className={`p-5 rounded-2xl border text-left transition-all relative ${narrativeStyle === style.title ? "border-[#5A7A62] ring-1 ring-[#5A7A62] bg-[#FAFCFB]" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900">{style.title}</h4>
                      {narrativeStyle === style.title ? <CheckCircle2 className="w-5 h-5 text-[#5A7A62]" /> : <Circle className="w-5 h-5 text-gray-300" />}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* DAILY REMINDER CARD */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#EAF2ED] p-2.5 rounded-xl"><Clock className="w-5 h-5 text-[#5A7A62]" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Daily Reminder</h3>
                  <p className="text-sm text-gray-500">Set a gentle nudge time for your reflection.</p>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Reminder Time</label>
                    <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50/50">
                      <Clock className="w-5 h-5 text-gray-400 mr-3" />
                      <input type="time" defaultValue="20:00" className="bg-transparent border-none focus:outline-none text-gray-900 font-medium w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Repeat On</label>
                    <div className="flex gap-2">
                      {daysOfWeek.map((day) => (
                        <button key={day.id} onClick={() => toggleDay(day.id)} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${activeDays.includes(day.id) ? "bg-[#5A7A62] text-white" : "bg-white border border-gray-200 text-gray-400 hover:bg-gray-50"}`}>
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-[#FAFCFB] rounded-2xl p-6 border border-[#EAF2ED]">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3"><Bell className="w-5 h-5 text-gray-500" /><span className="text-sm font-semibold text-gray-900">Push Notifications</span></div>
                      <button onClick={() => setPushEnabled(!pushEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${pushEnabled ? 'bg-[#5A7A62]' : 'bg-gray-200'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${pushEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-gray-500" /><span className="text-sm font-semibold text-gray-900">Email Digest</span></div>
                      <button onClick={() => setEmailEnabled(!emailEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${emailEnabled ? 'bg-[#5A7A62]' : 'bg-gray-200'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${emailEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RESPONSE LENGTH CARD */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-[#EAF2ED] p-2.5 rounded-xl"><SlidersHorizontal className="w-5 h-5 text-[#5A7A62]" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Response Length</h3>
                    <p className="text-sm text-gray-500">How talkative should the AI be?</p>
                  </div>
                </div>
                <span className="bg-[#EAF2ED] text-[#5A7A62] text-xs font-bold px-4 py-1.5 rounded-full">{responseLength}</span>
              </div>
              <div className="relative pt-6 pb-2 px-4">
                <div className="absolute top-8 left-4 right-4 h-2 bg-[#FAF9F6] rounded-full border border-gray-100 overflow-hidden">
                  <div className="h-full bg-[#E5DFD3] transition-all duration-300" style={{ width: responseLength === 'Concise' ? '0%' : responseLength === 'Moderate' ? '50%' : '100%' }} />
                </div>
                <div className="flex justify-between relative z-10">
                  {["Concise", "Moderate", "Detailed"].map((length) => (
                    <button key={length} onClick={() => setResponseLength(length)} className="flex flex-col items-center gap-3 group">
                      <div className={`w-5 h-5 rounded-full border-4 transition-colors ${responseLength === length ? "bg-white border-[#5A7A62] shadow-sm scale-110" : "bg-white border-[#E5DFD3] group-hover:border-gray-300"}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${responseLength === length ? "text-[#5A7A62]" : "text-gray-400"}`}>{length}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FLOATING ACTION BAR */}
        <div className="sticky bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 flex justify-center z-50 mt-auto">
          <div className="w-full max-w-4xl flex justify-end gap-4 md:px-0">
            <button className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Discard Changes
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className={`px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm ${isSaving ? 'bg-[#8EACA0] cursor-not-allowed' : 'bg-[#5A7A62] hover:bg-[#4A6652]'}`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}