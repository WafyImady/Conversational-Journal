"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // <-- ADD useSearchParams
import JournalFeed, { Message } from "@/components/JournalFeed";
import Sidebar from "@/components/Sidebar";
import RightSidebar from "@/components/RightSidebar";
import ChatInput from "@/components/ChatInput";
import { createClient } from "@/utils/client";
import { Loader2, AlertCircle, X } from "lucide-react"; // <-- ADD AlertCircle

function DashboardContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("id"); // Check if we are resuming a chat

  // --- 1. THE SESSION TRACKERS ---
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAuthChecking, setIsAuthChecking] = useState(true); 
  const [isTyping, setIsTyping] = useState(false);

  // --- NEW: INCOMPLETE SESSION TRACKER ---
  // Add createdAt to the state interface
  const [incompleteEntry, setIncompleteEntry] = useState<{ id: string; status: string; createdAt: string } | null>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  // --- THE GREETING ENGINE ---
  useEffect(() => {
    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";

    setMessages([{
      id: "echo-greeting",
      role: "ai",
      content: `${greeting}. Take a deep breath. How are you feeling right now?`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) 
    }]);
  }, []);

  // --- THE SEAMLESS BOUNCER & RESUME ENGINE ---
  useEffect(() => {
    const checkAuthAndSessions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      setIsAuthChecking(false);

      // SCENARIO A: User clicked "Resume Session" and the URL has ?id=xxx
      if (resumeId) {
        const { data: entry } = await supabase
          .from('journal_entries')
          .select('chat_transcript')
          .eq('id', resumeId)
          .single();

        if (entry && entry.chat_transcript) {
          setActiveEntryId(resumeId);
          setMessages(entry.chat_transcript);
        }
        return; 
      }

      // SCENARIO B: Check for unfinished business within the LAST 24 HOURS
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('journal_entries')
        .select('id, status, created_at')
        .eq('user_id', session.user.id)
        .neq('status', 'completed')
        .gte('created_at', twentyFourHoursAgo.toISOString()) // <-- THE 24-HOUR FILTER!
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !activeEntryId) {
        setIncompleteEntry({ 
          id: data.id, 
          status: data.status, 
          createdAt: data.created_at 
        });
      }
    };
    
    checkAuthAndSessions();
  }, [router, resumeId, activeEntryId, supabase]);

  // --- THE UPGRADED CHAT ENGINE ---
  const handleNewMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    const currentTranscript = [...messages, userMessage];
    setMessages(currentTranscript);
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      let currentId = activeEntryId;

      if (!currentId) {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert({
            user_id: session.user.id,
            status: 'chatting',
            chat_transcript: currentTranscript 
          })
          .select('id')
          .single();

        if (error) throw error;
        
        if (data) {
          currentId = data.id; 
          setActiveEntryId(data.id); 
        }
      } else {
        const { error } = await supabase
          .from('journal_entries')
          .update({ chat_transcript: currentTranscript })
          .eq('id', currentId);
          
        if (error) throw error;
      }

      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ text: text, transcript: currentTranscript }), 
      });

      const data = await response.json();

      let finalMessage = "I'm sorry, my brain disconnected for a second. Could you repeat that?";
      if (data.error) {
        finalMessage = `⚠️ System Error: ${data.error}`;
      } else if (data.entry && data.entry.narrative) {
        finalMessage = data.entry.narrative;
      }

      const detectedEmotionArray = data.entry && data.entry.emotions ? [data.entry.emotions] : [];

      const updatedUserMessage = {
        ...userMessage,
        emotions: detectedEmotionArray
      };

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: finalMessage,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };

      const finalTranscript = [...messages, updatedUserMessage, aiMessage];
      setMessages(finalTranscript);

      await supabase
        .from('journal_entries')
        .update({ chat_transcript: finalTranscript })
        .eq('id', currentId);

    } catch (error) {
      console.error("Failed to process message:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeEntryId) {
      alert("Please send at least one message before ending the reflection.");
      return;
    }

    try {
      await supabase
        .from('journal_entries')
        .update({ status: 'analyzing' })
        .eq('id', activeEntryId);

      router.push(`/analytics?id=${activeEntryId}`);
      
    } catch (error) {
      console.error("Failed to transition to analysis:", error);
    }
  };

  // NEW: The Loading Screen Intercept
  if (isAuthChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8EACA0]" />
      </div>
    );
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
    
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return isToday ? `Today at ${time}` : `Yesterday at ${time}`;
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-grow flex flex-col h-screen overflow-hidden relative border-r border-[#E5E2DB]">
        <header className="w-full px-10 pt-8 pb-6 bg-[#FAF9F6] z-10 flex-shrink-0 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight text-[#2A2A2A]">Today's Reflection</h1>
            <p className="text-sm text-[#7F7F7F] mt-1">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          {activeEntryId && (
            <button 
              onClick={handleEndSession}
              className="bg-[#D28C81] hover:bg-[#C17A6F] text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
            >
              End & Analyze
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          )}
        </header>

        {/* --- NEW: THE UNFINISHED SESSION ALERT CARD --- */}
        {incompleteEntry && !activeEntryId && !isAlertDismissed && (
          <div className="px-10 mt-6 shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* FIX 1: Added md:pr-16 to create a safe zone on the right side */}
            <div className="bg-[#FCF4F2] border border-[#F5E6E3] p-5 md:pr-16 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm relative group">
              
              {/* FIX 2: Centered vertically on the right edge with a white background */}
              <button 
                onClick={() => setIsAlertDismissed(true)}
                className="absolute top-1/2 -translate-y-1/2 right-4 p-1.5 bg-white shadow-sm border border-[#F5E6E3] text-gray-400 hover:text-gray-900 rounded-full transition-all outline-none"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <div className="flex items-center flex-wrap gap-2 mb-1.5">
                  <AlertCircle className="w-4 h-4 text-[#D28C81]" />
                  <h4 className="font-bold text-gray-900 text-sm">Unfinished Session Detected</h4>
                  
                  <span className="px-2 py-0.5 bg-white border border-[#F5E6E3] text-[#D28C81] text-[9px] font-bold uppercase tracking-wider rounded-md shadow-sm">
                    {formatTimeAgo(incompleteEntry.createdAt)}
                  </span>
                </div>
                
                <p className="text-xs text-gray-500 leading-relaxed">
                  {incompleteEntry.status === 'chatting' && "You have an open reflection session. Let's finish your conversation with Echo."}
                  {incompleteEntry.status === 'analyzing' && "Your session has been saved, but your emotional frequencies haven't been reviewed yet."}
                  {incompleteEntry.status === 'reviewing' && "Your journal draft and action plans are ready! Take a moment to review and lock them in."}
                </p>
              </div>
              
              <div className="flex shrink-0 w-full md:w-auto">
                <button 
                  onClick={() => {
                    if (incompleteEntry.status === 'chatting') router.push(`/?id=${incompleteEntry.id}`); 
                    else if (incompleteEntry.status === 'analyzing') router.push(`/analytics?id=${incompleteEntry.id}`);
                    else if (incompleteEntry.status === 'reviewing') router.push(`/insights?id=${incompleteEntry.id}`);
                  }}
                  className="w-full md:w-auto px-5 py-2 bg-[#D28C81] hover:bg-[#C17A6F] text-white text-xs font-bold rounded-xl transition-all shadow-sm tracking-wide"
                >
                  {incompleteEntry.status === 'chatting' && "Continue Chatting"}
                  {incompleteEntry.status === 'analyzing' && "Review Sliders"}
                  {incompleteEntry.status === 'reviewing' && "View Final Draft"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* --- END ALERT CARD --- */}

        <div className="flex-grow overflow-y-auto px-10 py-6 flex flex-col">
          <JournalFeed messages={messages} isTyping={isTyping} />
          
          {/* NEW: Quick Start Chips appear ONLY when the AI has spoken, but the user hasn't yet */}
          {messages.length === 1 && (
            <div className="mt-2 flex flex-wrap gap-3 max-w-2xl">
              {[
                "I'm feeling a bit anxious.",
                "Today was actually really great.",
                "I have a lot on my mind.",
                "I just need to vent."
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleNewMessage(prompt)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-500 rounded-full text-sm hover:border-[#8EACA0] hover:text-[#8EACA0] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full bg-[#FAF9F6] px-10 pb-8 pt-4 flex-shrink-0 border-t border-[#E5E2DB]">
          <div className="max-w-4xl mx-auto w-full">
            <ChatInput onSendMessage={handleNewMessage} />
          </div>
        </div>
      </main>

      <RightSidebar />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8EACA0]" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}