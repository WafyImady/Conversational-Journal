import Sidebar from "@/app/components/Sidebar";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-grow flex flex-col bg-[#FAF9F6] p-10">
        <h1 className="text-3xl font-bold text-[#2A2A2A]">AI Insights</h1>
        <p className="mt-4 text-[#7F7F7F]">Your AI Insights will go here.</p>
      </main>
    </div>
  );
}