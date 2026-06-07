export default function WeeklyStreak() {
  // A simple array to map out the varying heights of your streak bars
  const streakData = [
    { id: 1, height: "h-5", color: "bg-[#EFECE5]" },
    { id: 2, height: "h-8", color: "bg-[#EFECE5]" },
    { id: 3, height: "h-4", color: "bg-[#EFECE5]" },
    { id: 4, height: "h-10", color: "bg-[#EFECE5]" },
    { id: 5, height: "h-14", color: "bg-[#E2AD9A]" }, // Active day (Orange/Pink)
    { id: 6, height: "h-3", color: "bg-[#EFECE5]" },
    { id: 7, height: "h-2", color: "bg-[#EFECE5]" },
  ];

  return (
    <div className="bg-white p-5 rounded-3xl border border-[#E5E2DB] shadow-sm mt-auto">
      <h3 className="text-[10px] font-bold text-[#A3A097] tracking-wider uppercase mb-4">
        Weekly Streak
      </h3>
      
      {/* The Bar Chart */}
      <div className="flex items-end justify-between gap-1 mb-4 h-16">
        {streakData.map((bar) => (
          <div
            key={bar.id}
            className={`w-1/7 w-full rounded-t-sm ${bar.height} ${bar.color}`}
          ></div>
        ))}
      </div>

      <p className="text-xs text-[#2A2A2A] text-center font-medium">
        You're on a roll! <span className="text-orange-500">🔥</span> 5 days
      </p>
    </div>
  );
}