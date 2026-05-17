export default function JournalFeed() {
  return (
    <div className="flex flex-col gap-6 w-full pb-8 animate-fade-in-up">
      
      {/* A single journal entry card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <p className="text-slate-800 leading-relaxed text-lg">
          "I've been feeling a bit overwhelmed with my FYP lately. There is just so much to balance between finalizing the Next.js setup for Echo and finishing up the ESG risk integration research..."
        </p>
        
        {/* Footer of the card: Timestamp and AI Emotion Tag */}
        <div className="mt-4 flex justify-between items-center border-t border-slate-50 pt-3">
          <span className="text-xs text-slate-400 font-medium">May 17, 2026 • 10:21 PM</span>
          
          {/* This is a placeholder for your DistilBERT emotion detection! */}
          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
            Overwhelmed
          </span>
        </div>
      </div>

    </div>
  );
}