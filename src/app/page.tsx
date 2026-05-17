import VoiceRecordButton from "@/app/components/VoiceRecordButton";
import JournalFeed from "@/app/components/JournalFeed";
import Sidebar from "@/app/components/Sidebar";

export default function Home() {
  return (
    // New Dashboard Layout: Flex row.
    <div className="flex min-h-screen">
      
      {/* Sidebar Component (Locked to the left) */}
      <Sidebar />

      {/* Main Content Area (Scrollable section on the right) */}
      <main className="flex-grow flex flex-col bg-[#FAF9F6]">
        
        {/* Figma Header (Today's Reflection section in image_0.png) */}
        <header className="w-full px-10 pt-8 pb-6 bg-[#FAF9F6] sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-start">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold tracking-tight text-[#2A2A2A]">Today's Reflection</h1>
              <p className="text-sm text-[#7F7F7F] mt-1">October 24, 2023</p>
            </div>
            {/* [ New Entry & Search can go here later ] */}
          </div>
        </header>

        {/* The "Chat" Area (Where JournalFeed is) */}
        <div className="flex-grow w-full max-w-5xl mx-auto px-10 py-6 flex flex-col justify-end">
          <JournalFeed />
        </div>

        {/* Bottom Input Area (Where VoiceButton is) */}
        <div className="w-full bg-[#FAF9F6] px-10 pb-10">
          <div className="max-w-5xl mx-auto flex items-center justify-center p-2 min-h-[100px] bg-white rounded-3xl border border-[#E5E2DB] shadow-sm">
            <VoiceRecordButton />
          </div>
        </div>

      </main>
    </div>
  );
}