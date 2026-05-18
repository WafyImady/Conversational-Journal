"use client"; // Needs this because it holds the master state!

import { useState } from "react";
import JournalFeed, { Message } from "@/app/components/JournalFeed";
import Sidebar from "@/app/components/Sidebar";
import RightSidebar from "@/app/components/RightSidebar";
import ChatInput from "@/app/components/ChatInput";

export default function Home() {
  // 1. Master list of messages (starts with your Figma text)
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

    // 2. Call our new Backend API!
    try {
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      });

      const data = await response.json();

      // 3. Error Checking Logic (This creates the 'finalMessage' variable!)
      let finalMessage = "";
      if (data.error) {
        finalMessage = `⚠️ System Error: ${data.error}`;
      } else if (data.message) {
        finalMessage = data.message;
      } else {
        finalMessage = "I'm sorry, my brain disconnected for a second. Could you repeat that?";
      }

      // 4. Create the AI's message bubble
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: finalMessage, // Uses the variable we just defined above
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emotions: data.detectedEmotions // Grabs the dynamic tags from Gemini!
      };

      // 5. Add the AI message to the screen
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
          {/* 3. Pass the master list to the Feed */}
          <JournalFeed messages={messages} />
        </div>

        <div className="w-full bg-[#FAF9F6] px-10 pb-8 pt-4 flex-shrink-0 border-t border-[#E5E2DB]">
          <div className="max-w-4xl mx-auto w-full">
             {/* 4. Pass the function to the Input */}
            <ChatInput onSendMessage={handleNewMessage} />
          </div>
        </div>
      </main>

      <RightSidebar />
    </div>
  );
}