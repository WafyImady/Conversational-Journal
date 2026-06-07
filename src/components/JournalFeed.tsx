import { Bot, User as UserIcon } from "lucide-react";

export type Message = {
  id: string;
  role: "ai" | "user";
  content: string;
  time: string;
  emotions?: string[]; 
};

interface JournalFeedProps {
  messages: Message[];
}

export default function JournalFeed({ messages = [] }: JournalFeedProps) {
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
              {msg.role === "ai" ? "AI Companion" : "You"} • {msg.time}
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
                  <span key={idx} className="bg-[#E8F0FE] text-[#1A73E8] px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-[#CDE0FA]">
                    {emotion}
                  </span>
                ))}
              </div>
            )}
            {/* --------------------------- */}
            
          </div>
        </div>
      ))}
    </div>
  );
}