"use client"; 

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; 
import { LayoutGrid, TrendingUp, BrainCircuit, BookOpenText, Settings } from "lucide-react";
import WeeklyStreak from "./WeeklyStreak";
import { createClient } from "@/utils/client"; 

export default function Sidebar() {
  const pathname = usePathname(); 
  const supabase = createClient();
  
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 1. Check if they have a custom display name saved in user_settings
        const { data } = await supabase
          .from('user_settings')
          .select('display_name')
          .eq('user_id', user.id)
          .single();

        if (data && data.display_name) {
          // 2. Use their chosen name
          setUserName(data.display_name);
        } else if (user.email) {
          // 3. Fallback: Clean up their email if no name is set yet
          const cleanEmail = user.email.split('@')[0].replace(/[._]/g, ' ');
          setUserName(cleanEmail);
        }
      }
    }

    fetchUserProfile();
  }, [supabase]);

  const navItems = [
    { name: "Dashboard", icon: LayoutGrid, path: "/" },
    { name: "Emotional Analytics", icon: TrendingUp, path: "/analytics" },
    { name: "AI Insights", icon: BrainCircuit, path: "/insights" },
    { name: "Journal History", icon: BookOpenText, path: "/history" },
    { name: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <aside className="w-72 min-h-screen bg-[#F8F6F2] p-6 border-r border-[#E5E2DB] flex flex-col gap-10">
      
      {/* Profile Section - UPGRADED & DYNAMIC (Kept at the top) */}
      <div className="flex items-center gap-3 p-2 pr-6 bg-white rounded-full border border-[#DCDAD2] shadow-sm hover:border-[#8EACA0] hover:shadow-md transition-all cursor-pointer group">
          
        {/* Dynamic Initial Avatar */}
        <div className="w-11 h-11 rounded-full bg-[#5A7A62] flex items-center justify-center shrink-0 border-2 border-[#EAF2ED] group-hover:scale-105 transition-transform">
          <span className="text-white text-lg font-bold tracking-wider uppercase">
            {userName ? userName.charAt(0) : "U"}
          </span>
        </div>

        {/* Refined Typography Stack */}
        <div className="flex flex-col justify-center overflow-hidden">
          <span className="text-sm font-bold text-[#2A2A2A] capitalize group-hover:text-[#5A7A62] transition-colors leading-tight truncate max-w-[120px]">
            {userName || "Loading..."}
          </span>
          <span className="text-[10px] font-bold text-[#8B8674] uppercase tracking-widest mt-1">
            Echo Journal
          </span>
        </div>

      </div>

      {/* Navigation Section */}
      <nav className="flex-grow">
        <ul className="space-y-3">
          {navItems.map((item) => {
            const isActive = pathname === item.path;

            return (
              <li key={item.name}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all duration-200 ${
                    isActive 
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