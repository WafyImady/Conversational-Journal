"use client";

import { Bot, User as UserIcon } from "lucide-react";
import { useEffect, useRef } from "react";

export type Message = {
  id: string;
  role: "ai" | "user";
  content: string;
  time: string;
  emotions?: any[]; // Loosened to accept strings or raw formats safely
};

interface JournalFeedProps {
  messages: Message[];
  isTyping?: boolean;
}

// --- SMART DYNAMIC UI FALLBACK ENGINE ---
const getUIEmotionData = (hfMood: string) => {
  const m = hfMood?.toLowerCase() || 'neutral';
  const formattedLabel = m.charAt(0).toUpperCase() + m.slice(1);

  // 1. Strict Dictionary Matches (GoEmotions 28 Labels)
  if (['admiration', 'amusement', 'approval', 'caring', 'desire', 'excitement', 'gratitude', 'joy', 'love', 'optimism', 'pride', 'relief'].includes(m)) {
    return { label: formattedLabel, color: 'text-green-600 bg-green-50 border-green-200' };
  }
  if (['curiosity', 'realization', 'surprise'].includes(m)) {
    return { label: formattedLabel, color: 'text-blue-600 bg-blue-50 border-blue-200' };
  }
  if (['confusion', 'embarrassment', 'fear', 'nervousness'].includes(m)) {
    return { label: formattedLabel, color: 'text-purple-600 bg-purple-50 border-purple-200' };
  }
  if (['anger', 'annoyance', 'disappointment', 'disapproval', 'disgust', 'grief', 'remorse', 'sadness'].includes(m)) {
    return { label: formattedLabel, color: 'text-orange-600 bg-orange-50 border-orange-200' };
  }

  // 2. Future-Proofing for Custom Entries (if added later)
  const positiveKeywords = ['happy', 'good', 'chill', 'hype', 'peace', 'great', 'motivate', 'producti', 'optimis', 'excit', 'proud', 'grate'];
  const negativeKeywords = ['sad', 'bad', 'tire', 'down', 'stress', 'hurt', 'exhaust', 'anxio', 'worr', 'overwhelm', 'burnout', 'angr', 'mad', 'annoy', 'frustrat'];

  if (positiveKeywords.some(word => m.includes(word))) {
    return { label: formattedLabel, color: 'text-green-600 bg-green-50 border-green-200' };
  }
  if (negativeKeywords.some(word => m.includes(word))) {
    return { label: formattedLabel, color: 'text-orange-600 bg-orange-50 border-orange-200' };
  }

  // 3. True Unknown Fallback
  return { label: formattedLabel, color: 'text-stone-600 bg-stone-50 border-stone-200' };
};

export default function JournalFeed({ messages = [], isTyping }: JournalFeedProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      {messages?.map((msg) => (
        <div 
          key={msg.id} 
          className={`flex gap-4 w-full max-w-2xl ${msg.role === "user" ? "self-end flex-row-reverse" : ""}`}
        >
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border overflow-hidden ${msg.role === "user" ? "bg-[#E5E1D5] border-[#CDC9BF]" : "bg-[#F0F2EB] border-[#E1E5D9]"}`}>
            {msg.role === "user" ? (
               <UserIcon className="w-6 h-6 text-[#8B8674] mt-2" />
            ) : (
               <Bot className="w-5 h-5 text-[#6A7F5D]" />
            )}
          </div>

          {/* Message Bubble */}
          <div className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : ""}`}>
            <span className={`text-[11px] text-[#A3A097] font-semibold tracking-wide uppercase ${msg.role === "user" ? "mr-1" : "ml-1"}`}>
              {msg.role === "ai" ? "Echo" : "You"} • {msg.time}
            </span>
            
            <div className={`text-[#2A2A2A] p-5 rounded-3xl leading-relaxed text-sm ${
              msg.role === "user" 
                ? "bg-[#F5F6F3] rounded-tr-sm border border-[#EAECE6]" 
                : "bg-[#F3EFEA] rounded-tl-sm"
            }`}>
              {msg.content}
            </div>

            {/* --- FIXED DYNAMIC EMOTION TAGS UI --- */}
            {msg.emotions && msg.emotions.length > 0 && (
              <div className={`flex flex-wrap gap-2 mt-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.emotions.map((rawEmotion, idx) => {
                  // Safely handle strings or objects so the app never crashes
                  let cleanName = "";
                  if (typeof rawEmotion === 'string') {
                    cleanName = rawEmotion;
                  } else if (Array.isArray(rawEmotion)) {
                    cleanName = typeof rawEmotion[0] === 'string' ? rawEmotion[0] : (rawEmotion[0]?.name || "Neutral");
                  } else if (rawEmotion && typeof rawEmotion === 'object') {
                    cleanName = rawEmotion.name || rawEmotion.label || "Neutral";
                  }

                  const uiData = getUIEmotionData(cleanName);

                  return (
                    <span 
                      key={idx} 
                      className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${uiData.color}`}
                    >
                      {uiData.label}
                    </span>
                  );
                })}
              </div>
            )}
            
          </div>
        </div>
      ))}
      
      {/* TYPING INDICATOR */}
      {isTyping && (
        <div className="flex gap-4 w-full max-w-2xl justify-start animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border overflow-hidden bg-[#F0F2EB] border-[#E1E5D9]">
             <Bot className="w-5 h-5 text-[#6A7F5D]" />
          </div>
          <div className="bg-[#F3EFEA] border border-[#E1E5D9] rounded-3xl rounded-tl-sm px-5 py-4 max-w-[80%] shadow-sm flex items-center gap-1.5 mt-4">
            <span className="w-2 h-2 bg-[#6A7F5D] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 bg-[#6A7F5D] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 bg-[#6A7F5D] rounded-full animate-bounce"></span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
}