"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/client";

interface StreakDay {
  id: number;
  date: string;
  hasEntry: boolean;
  height: string;
  color: string;
}

export default function WeeklyStreak() {
  const supabase = createClient();
  const [streakData, setStreakData] = useState<StreakDay[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        setIsLoading(true); // 1. Start loading

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        // 2. If no user, log it, but the 'finally' block will still turn off the spinner!
        if (authError || !user) {
          console.warn("No active user session found.");
          return; 
        }

        // --- YOUR EXISTING DATE & STREAK LOGIC STAYS EXACTLY THE SAME ---
        const dates: string[] = [];
        const today = new Date();
        const dayOfWeek = today.getDay(); 
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - diff);

        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          dates.push(d.toLocaleDateString('en-CA'));
        }

        const lookbackdata = new Date();
        lookbackdata.setDate(lookbackdata.getDate() - 365);
        
        const { data: entries, error: dbError } = await supabase
          .from('journal_entries')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', lookbackdata.toISOString());

        if (dbError) throw dbError; // Send any database errors straight to the catch block

        const activeDates = new Set(
          entries?.map(entry => new Date(entry.created_at).toLocaleDateString('en-CA')) || []
        );

        const chartData = dates.map((dateStr, index) => {
          const hasEntry = activeDates.has(dateStr);
          return {
            id: index,
            date: dateStr,
            hasEntry,
            height: hasEntry ? "h-10" : "h-3",
            color: hasEntry ? "bg-[#E2AD9A]" : "bg-[#EFECE5]"
          };
        });

        let currentStreak = 0;
        const todayStr = new Date().toLocaleDateString('en-CA');
        let checkDate = new Date();
        
        if (!activeDates.has(todayStr)) {
           checkDate.setDate(checkDate.getDate() - 1);
        }

        for (let i = 0; i < 365; i++) { 
          const dateStr = checkDate.toLocaleDateString('en-CA');
          if (activeDates.has(dateStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1); 
          } else {
            break; 
          }
        }

        // 3. Set the data
        setStreakData(chartData);
        setStreakCount(currentStreak);

      } catch (error) {
        console.error("Failed to fetch streak data:", error);
      } finally {
        // 4. THE MAGIC BULLET: This runs 100% of the time, killing the infinite spinner!
        setIsLoading(false);
      }
    };

    fetchStreak();
  }, [supabase]);

  // Render a smooth skeleton loader while fetching to prevent layout shift
  if (isLoading) {
    return (
      <div className="bg-white p-5 rounded-3xl border border-[#E5E2DB] shadow-sm mt-auto h-[140px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#E2AD9A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-3xl border border-[#E5E2DB] shadow-sm mt-auto transition-all">
      <h3 className="text-[10px] font-bold text-[#A3A097] tracking-wider uppercase mb-4">
        Weekly Streak
      </h3>
      
      {/* The Dynamic Bar Chart */}
      <div className="flex items-end justify-between gap-1 mb-4 h-12">
        {streakData.map((bar) => (
          <div
            key={bar.id}
            title={bar.date} // Hover to see the date!
            className={`w-full rounded-t-sm transition-all duration-500 ease-out ${bar.height} ${bar.color}`}
          ></div>
        ))}
      </div>

      <p className="text-xs text-[#2A2A2A] text-center font-medium">
        {streakCount > 0 ? (
          <>You're on a roll! <span className="text-orange-500">🔥</span> {streakCount} {streakCount === 1 ? 'day' : 'days'}</>
        ) : (
          <span className="text-[#A3A097]">Start your streak today! ✨</span>
        )}
      </p>
    </div>
  );
}