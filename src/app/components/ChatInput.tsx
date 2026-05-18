"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Send, X, Mic, Volume2, Square } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  
  // NEW: This remembers what was in the text box before you hit record!
  const baseTextRef = useRef(""); 

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        
        // --- 1. THE SPEED FIX ---
        // This tells the API to stream words live instead of waiting for a pause
        recognition.interimResults = true; 

        recognition.onresult = (event: any) => {
          let currentSessionTranscript = "";
          
          // Loop through everything the mic has heard since we clicked record
          for (let i = 0; i < event.results.length; ++i) {
            currentSessionTranscript += event.results[i][0].transcript;
          }
          
          // Combine what was already typed with the live spoken words
          setText(baseTextRef.current + (baseTextRef.current ? " " : "") + currentSessionTranscript);
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            console.error("Microphone Error:", event.error);
          }
        };

        recognition.onend = () => {
          // 2. THE DROP-OUT FIX
          // If the browser kills the mic because of silence, ensure our UI red button turns off too!
          setIsRecording(false); 
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const handleSend = () => {
    if (text.trim() === "") return;
    onSendMessage(text);
    setText(""); 
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        // Save whatever is currently in the text box before we start speaking
        baseTextRef.current = text; 
        recognitionRef.current.start();
        setIsRecording(true);
      } else {
        alert("Your browser doesn't support speech recognition. Please use Google Chrome or Edge.");
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full bg-white p-6 rounded-3xl border border-[#E5E2DB] shadow-sm">
      <div className="bg-[#F3EFEA] rounded-2xl p-4 relative min-h-[120px] flex flex-col justify-between">
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          className="w-full bg-transparent resize-none outline-none text-[#2A2A2A] placeholder:text-[#A3A097] text-sm h-full"
          placeholder="Type your thoughts here..."
        />
        
        <div className="flex justify-between items-center mt-2">
          <button className="text-[#A3A097] hover:text-[#2A2A2A] transition-colors">
            <Plus className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSend}
            className="bg-[#8B9C7A] text-white p-2 rounded-full hover:bg-[#6A7F5D] transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex justify-center items-center gap-6">
         <button className="w-12 h-12 rounded-full bg-[#F3EFEA] flex items-center justify-center text-[#7F7F7F] hover:bg-[#EAE5DF] transition-colors border border-[#E5E2DB]">
           <X className="w-5 h-5" />
         </button>
         
         <button 
           onClick={toggleRecording}
           className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-md transition-all transform hover:scale-105 ${
             isRecording 
               ? "bg-red-500 shadow-red-500/40 animate-pulse" 
               : "bg-[#E2AD9A] shadow-[#E2AD9A]/40 hover:bg-[#D59B87]" 
           }`}
         >
           {isRecording ? <Square className="w-6 h-6" fill="currentColor" /> : <Mic className="w-6 h-6" />}
         </button>

         <button className="w-12 h-12 rounded-full bg-[#F3EFEA] flex items-center justify-center text-[#7F7F7F] hover:bg-[#EAE5DF] transition-colors border border-[#E5E2DB]">
           <Volume2 className="w-5 h-5" />
         </button>
      </div>
    </div>
  );
}