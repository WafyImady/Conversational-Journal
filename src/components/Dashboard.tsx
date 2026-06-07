"use client";

import { useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Message } from "./JournalFeed"; // Adjust import path if needed!

// A nice color palette for the bars
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Dashboard({ messages }: { messages: Message[] }) {
  
  // This hook automatically recalculates the chart data whenever a new message is sent
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};

    messages.forEach((msg) => {
      // Look for the emotion tags attached to the AI's replies
      if (msg.role === "ai" && msg.emotions) {
        msg.emotions.forEach((emotion) => {
          counts[emotion] = (counts[emotion] || 0) + 1;
        });
      }
    });

    // Convert the tally object into an array for Recharts
    return Object.keys(counts)
      .map((key) => ({
        name: key,
        count: counts[key],
      }))
      .sort((a, b) => b.count - a.count); // Sort highest to lowest
  }, [messages]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <p className="text-gray-400">Keep journaling to see your emotional insights...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      <h2 className="mb-6 text-xl font-bold text-gray-800">Your Emotional Landscape</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              allowDecimals={false} 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip 
              cursor={{ fill: '#F3F4F6' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}