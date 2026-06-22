"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import JournalFeed, { Message } from "@/components/JournalFeed";
import Sidebar from "@/components/Sidebar";
import RightSidebar from "@/components/RightSidebar";
import ChatInput from "@/components/ChatInput";
import { createClient } from "@/utils/client";
import { Loader2 } from "lucide-react"; // <-- Added this for the loading spinner!

export default function Home() {
  const supabase = createClient();
  const router = useRouter();

  // --- 1. THE SESSION TRACKERS ---
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // NEW: Track if we are checking the user's login status
  const [isAuthChecking, setIsAuthChecking] = useState(true); 

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

  // --- THE SEAMLESS BOUNCER ---
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setIsAuthChecking(false); // Valid user! Stop loading and show the page.
      }
    };
    checkAuth();
  }, [router]); // Removed supabase to prevent hot-reload warnings

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

        <div className="flex-grow overflow-y-auto px-10 py-6 flex flex-col">
          <JournalFeed messages={messages} />
          
          {/* NEW: Quick Start Chips appear ONLY when the AI has spoken, but the user hasn't yet */}
          {messages.length === 1 && (
            <div className="mt-8 flex flex-wrap gap-3 max-w-2xl">
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