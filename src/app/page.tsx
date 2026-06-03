"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import JournalFeed, { Message } from "@/app/components/JournalFeed";
import Sidebar from "@/app/components/Sidebar";
import RightSidebar from "@/app/components/RightSidebar";
import ChatInput from "@/app/components/ChatInput";
import { supabase } from "@/utils/supabaseClient";

export default function Home() {
  const router = useRouter();

  // --- 1. THE SESSION TRACKERS ---
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); // Started empty for a fresh chat

  // --- THE BOUNCER ---
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  // --- THE UPGRADED CHAT ENGINE ---
  const handleNewMessage = async (text: string) => {
    // 1. Create the user's message object
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // 2. Add it to the local UI immediately
    const currentTranscript = [...messages, userMessage];
    setMessages(currentTranscript);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      let currentId = activeEntryId;

      // ==========================================
      // DATABASE PHASE 1: SAVE THE USER'S MESSAGE
      // ==========================================
      if (!currentId) {
        // SCENARIO A: It's the very first message! Create the ONE row.
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
          currentId = data.id; // Store it locally
          setActiveEntryId(data.id); // Lock it in state for the next message
        }
      } else {
        // SCENARIO B: We are already chatting! Just append to the array.
        const { error } = await supabase
          .from('journal_entries')
          .update({ chat_transcript: currentTranscript })
          .eq('id', currentId);
          
        if (error) throw error;
      }

      // ==========================================
      // AI PHASE: GET GEMINI'S RESPONSE
      // ==========================================
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ transcript: currentTranscript }), 
      });

      const data = await response.json();

      let finalMessage = "I'm sorry, my brain disconnected for a second. Could you repeat that?";
      if (data.error) finalMessage = `⚠️ System Error: ${data.error}`;
      else if (data.message) finalMessage = data.message;

      // 1. FIX: Attach the detected emotions to the USER's message
      const updatedUserMessage = {
        ...userMessage,
        emotions: data.detectedEmotions || []
      };

      // 2. Create the AI's message (Echo doesn't have emotions, so we leave them off!)
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: finalMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      // ==========================================
      // DATABASE PHASE 2: SAVE THE AI'S MESSAGE
      // ==========================================
      // 3. Rebuild the array: Previous history + Updated User Message + AI Reply
      const finalTranscript = [...messages, updatedUserMessage, aiMessage];
      setMessages(finalTranscript); // Update UI

      await supabase
        .from('journal_entries')
        .update({ chat_transcript: finalTranscript })
        .eq('id', currentId);

    } catch (error) {
      console.error("Failed to process message:", error);
    }
  };

  // --- THE TRANSITION ENGINE ---
  const handleEndSession = async () => {
    if (!activeEntryId) {
      alert("Please send at least one message before ending the reflection.");
      return;
    }

    try {
      // 1. Update the database status so we know the chat is locked
      await supabase
        .from('journal_entries')
        .update({ status: 'analyzing' })
        .eq('id', activeEntryId);

      // 2. Route the user to the analysis page, passing the specific ID!
      router.push(`/analytics?id=${activeEntryId}`);
      
    } catch (error) {
      console.error("Failed to transition to analysis:", error);
    }
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
          
          {/* THE NEW BUTTON: Only shows up after they send their first message */}
          {activeEntryId && (
            <button 
              onClick={handleEndSession}
              className="bg-[#D28C81] hover:bg-[#C17A6F] text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
            >
              End & Analyze
              {/* Optional: Add a simple SVG arrow icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          )}
        </header>

        <div className="flex-grow overflow-y-auto px-10 py-6 flex flex-col">
          <JournalFeed messages={messages} />
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