"use client";

import { useState } from "react";

export default function VoiceRecordButton() {
  // This is "State". It remembers if the microphone is on or off.
  const [isRecording, setIsRecording] = useState(false);

  // This function flips the state when clicked
  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <button
      onClick={toggleRecording}
      className={`flex items-center justify-center gap-2 px-6 py-4 rounded-full font-semibold transition-all duration-300 ${
        isRecording
          ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40"
          : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
      }`}
    >
      {/* If recording is true, show the stop square. Otherwise, show the mic. */}
      {isRecording ? (
        <>
          <div className="w-3 h-3 bg-white rounded-sm" /> 
          Stop Recording
        </>
      ) : (
        <>
          <span className="text-xl">🎤</span>
          Tap to Speak
        </>
      )}
    </button>
  );
}