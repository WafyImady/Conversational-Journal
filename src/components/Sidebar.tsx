"use client"; // 1. We must add this to use the usePathname tool!

import Link from "next/link";
import { usePathname } from "next/navigation"; // 2. Import the tool
import { LayoutGrid, TrendingUp, BrainCircuit, BookOpenText, Settings, User } from "lucide-react";
import WeeklyStreak from "./WeeklyStreak";

export default function Sidebar() {
  const pathname = usePathname(); // 3. Get the current URL (e.g., "/" or "/settings")

  // 4. We removed the hardcoded "active: true/false" from here
  const navItems = [
    { name: "Dashboard", icon: LayoutGrid, path: "/" },
    { name: "Emotional Analytics", icon: TrendingUp, path: "/analytics" },
    { name: "AI Insights", icon: BrainCircuit, path: "/insights" },
    { name: "Journal History", icon: BookOpenText, path: "/history" },
    { name: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <aside className="w-72 min-h-screen bg-[#F8F6F2] p-6 border-r border-[#E5E2DB] flex flex-col gap-10">
      
      {/* Profile Section */}
      <div className="flex items-center gap-3 p-4 bg-white rounded-full border border-[#DCDAD2] shadow-inner-sm">
        <div className="w-12 h-12 rounded-full bg-[#E5E1D5] flex items-center justify-center border border-[#CDC9BF]">
          <User className="w-6 h-6 text-[#8B8674]" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold text-[#2A2A2A]">Student Journal</span>
          <span className="text-xs text-[#7F7F7F]">Welcome back, Alex</span>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-grow">
        <ul className="space-y-3">
          {navItems.map((item) => {
            // 5. THE MAGIC: Check if the current URL matches this button's path!
            const isActive = pathname === item.path;

            return (
              <li key={item.name}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all duration-200 ${
                    isActive // <-- Use the dynamic variable here!
                      ? "bg-white shadow-md text-[#2A2A2A] font-semibold"
                      : "text-[#7F7F7F] hover:bg-stone-100 hover:text-[#2A2A2A]"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 ${isActive ? "text-[#6A7F5D]" : "text-[#7F7F7F]"}`}
                    strokeWidth={2.5}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <WeeklyStreak />
    </aside>
  );
}