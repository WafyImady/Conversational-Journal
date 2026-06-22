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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Generate an array of dates for the CURRENT week (Mon-Sun) for the Chart
      const dates: string[] = [];
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - diff);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d.toLocaleDateString('en-CA'));
      }

      // 2. Fetch the last 30 days of entries to calculate a true historical streak
      const lookbackdata = new Date();
      lookbackdata.setDate(lookbackdata.getDate() - 365);
      
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', lookbackdata.toISOString());

      // 3. Create a Set of all active dates in the last 30 days
      const activeDates = new Set(
        entries?.map(entry => new Date(entry.created_at).toLocaleDateString('en-CA')) || []
      );

      // 4. Build the dynamic UI data mapping ONLY for this week's bars
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

      // 5. TRUE STREAK CALCULATION ENGINE
      let currentStreak = 0;
      const todayStr = new Date().toLocaleDateString('en-CA');
      
      // Start checking from today
      let checkDate = new Date();
      
      // If the user hasn't journaled today yet, it doesn't break the streak. 
      // We just start checking from yesterday to see if the streak is still alive.
      if (!activeDates.has(todayStr)) {
         checkDate.setDate(checkDate.getDate() - 1);
      }

      // Loop backward day by day to count consecutive entries
      for (let i = 0; i < 365; i++) { 
        const dateStr = checkDate.toLocaleDateString('en-CA');
        if (activeDates.has(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1); // Move backward one day
        } else {
          break; // The moment a gap is found, the streak is officially broken
        }
      }

      setStreakData(chartData);
      setStreakCount(currentStreak);
      setIsLoading(false);
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