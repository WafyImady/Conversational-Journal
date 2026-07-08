import { Bot, User as UserIcon } from "lucide-react";
import { useEffect, useRef } from "react"; // <-- 1. ADD THIS IMPORT

export type Message = {
  id: string;
  role: "ai" | "user";
  content: string;
  time: string;
  emotions?: string[]; 
};

interface JournalFeedProps {
  messages: Message[];
  isTyping?: boolean;
}

export default function JournalFeed({ messages = [], isTyping }: JournalFeedProps) {
  // 2. ADD THIS REF AND SCROLL LOGIC
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]); // Scroll whenever messages update OR when typing indicator toggles
  // ------------------------------------

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
              {msg.role === "ai" ? "Echo" : "You"} • {msg.time} {/* Changed AI Companion to Echo to match your brand */}
            </span>
            
            <div className={`text-[#2A2A2A] p-5 rounded-3xl leading-relaxed text-sm ${
              msg.role === "user" 
                ? "bg-[#F5F6F3] rounded-tr-sm border border-[#EAECE6]" 
                : "bg-[#F3EFEA] rounded-tl-sm"
            }`}>
              {msg.content}
            </div>

            {/* --- NEW EMOTION TAGS UI --- */}
            {msg.emotions && msg.emotions.length > 0 && (
              <div className={`flex gap-2 mt-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.emotions.map((emotion, idx) => (
                  <span key={idx} className="bg-[#E8F0FE] text-[#1A73E8] px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-[#CDE0FA] capitalize">
                    {emotion}
                  </span>
                ))}
              </div>
            )}
            {/* --------------------------- */}
            
          </div>
        </div>
      ))}
      
      {/* 3. THE TYPING INDICATOR AT THE BOTTOM */}
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

      {/* This invisible div is what the page scrolls down to! */}
      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
}