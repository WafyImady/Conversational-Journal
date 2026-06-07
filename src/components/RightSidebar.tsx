import { Lightbulb, Smile, Frown } from "lucide-react";

export default function RightSidebar() {
  return (
    // ADJUSTMENT MADE HERE: 
    // Increased width to w-96 (384px) for that wider, balanced feel.
    <aside className="w-96 min-h-screen bg-[#FAF9F6] p-8 border-l border-[#E5E2DB] flex flex-col gap-6 overflow-y-auto">
      
      {/* 1. Reflection Tip Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E2DB] shadow-sm relative">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#A3A097] tracking-wider uppercase">
            <Lightbulb className="w-3 h-3 text-[#E2AD9A]" />
            Reflection Tip
          </div>
          <span className="bg-[#F8F6F2] text-[#A3A097] text-[10px] px-2 py-1 rounded-full">Daily</span>
        </div>
        <p className="text-center text-[#2A2A2A] font-medium leading-relaxed italic relative z-10 px-2">
          "What made you smile today, even if just for a moment?"
        </p>
      </div>

      {/* 2. Daily Mood Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E2DB] shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-[#2A2A2A]">Daily Mood</h3>
          <span className="text-xs text-[#6A7F5D] cursor-pointer hover:underline">View Details</span>
        </div>
        
        {/* Because the overall panel is wider, these pills will stretch and look better */}
        <div className="grid grid-cols-2 gap-4">
          {/* Morning */}
          <div className="flex-1 bg-[#FEFCED] p-5 rounded-2xl border border-[#F5EED0] flex flex-col gap-1 items-start">
            <Smile className="w-5 h-5 text-yellow-500 mb-1" />
            <span className="text-[10px] text-[#A3A097]">Morning</span>
            <span className="text-sm font-bold text-[#2A2A2A]">Hopeful</span>
          </div>
          {/* Afternoon */}
          <div className="flex-1 bg-[#F1F6FF] p-5 rounded-2xl border border-[#DCE6F5] flex flex-col gap-1 items-start">
            <Frown className="w-5 h-5 text-blue-400 mb-1" />
            <span className="text-[10px] text-[#A3A097]">Afternoon</span>
            <span className="text-sm font-bold text-[#2A2A2A]">Anxious</span>
          </div>
        </div>
      </div>

      {/* 3. Reflection Prompts Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E2DB] shadow-sm flex flex-col gap-4">
        <h3 className="text-sm font-bold text-[#2A2A2A]">Reflection Prompts</h3>
        
        <div className="bg-[#F8F6F2] p-4 rounded-2xl border border-[#DCDAD2]">
          <span className="text-[10px] font-bold text-[#A3A097] tracking-wider uppercase block mb-1">Mindfulness</span>
          <p className="text-sm text-[#2A2A2A]">What is one small win you had today?</p>
        </div>

        <div className="bg-[#F8F6F2] p-4 rounded-2xl border border-[#DCDAD2]">
          <span className="text-[10px] font-bold text-[#A3A097] tracking-wider uppercase block mb-1">Growth</span>
          <p className="text-sm text-[#2A2A2A]">Describe a challenge you overcame recently.</p>
        </div>
      </div>

    </aside>
  );
}