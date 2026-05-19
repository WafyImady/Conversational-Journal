"use client"; // Needs this because it holds the master state!

import { useState, useEffect } from "react"; // <-- ADD useEffect here
import { useRouter } from "next/navigation"; // <-- ADD this import
import { createClient } from "@supabase/supabase-js";
import JournalFeed, { Message } from "@/app/components/JournalFeed";
import Sidebar from "@/app/components/Sidebar";
import RightSidebar from "@/app/components/RightSidebar";
import ChatInput from "@/app/components/ChatInput";

// Initialize Supabase OUTSIDE the component so it only runs once
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const router = useRouter();

  // --- THE BOUNCER ---
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // If there is no active session, instantly redirect to the login page
      if (!session) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);
  // 1. Master list of messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "Good morning, Alex. I noticed you've been feeling a bit anxious about your upcoming exams based on yesterday's entry. How are you feeling today?",
      time: "10:42 AM"
    },
    {
      id: "2",
      role: "user",
      content: "Honestly, I'm still a little stressed, but I managed to get some studying done this morning. I went for a run too, which helped clear my head a bit.",
      time: "10:44 AM",
      emotions: ["Productive", "Calm"]
    }
  ]);

  // The function that receives new text from the ChatInput
  const handleNewMessage = async (text: string) => {
    // 1. Instantly show the User's message on screen
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // 2. Get the current user's active session token
      const { data: { session } } = await supabase.auth.getSession();

      // 3. ONE clean fetch call with the secure token and the user's text
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}` // The digital ID badge!
        },
        body: JSON.stringify({ text: text }), // Send the exact text
      });

      const data = await response.json();

      // 4. Error Checking Logic
      let finalMessage = "";
      if (data.error) {
        finalMessage = `⚠️ System Error: ${data.error}`;
      } else if (data.message) {
        finalMessage = data.message;
      } else {
        finalMessage = "I'm sorry, my brain disconnected for a second. Could you repeat that?";
      }

      // 5. Create the AI's message bubble
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: finalMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emotions: data.detectedEmotions
      };

      // 6. Add the AI message to the screen
      setMessages((prev) => [...prev, aiMessage]);

    } catch (error) {
      console.error("Failed to connect to AI:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-grow flex flex-col h-screen overflow-hidden relative border-r border-[#E5E2DB]">
        <header className="w-full px-10 pt-8 pb-6 bg-[#FAF9F6] z-10 flex-shrink-0">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight text-[#2A2A2A]">Today's Reflection</h1>
            <p className="text-sm text-[#7F7F7F] mt-1">October 24, 2023</p>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto px-10 py-6 flex flex-col">
          {/* Pass the master list to the Feed */}
          <JournalFeed messages={messages} />
        </div>

        <div className="w-full bg-[#FAF9F6] px-10 pb-8 pt-4 flex-shrink-0 border-t border-[#E5E2DB]">
          <div className="max-w-4xl mx-auto w-full">
             {/* Pass the function to the Input */}
            <ChatInput onSendMessage={handleNewMessage} />
          </div>
        </div>
      </main>

      <RightSidebar />
    </div>
  );
}