"use client";

import { useState, useRef } from "react";
import { Plus, Send, X, Mic, Volume2, Square, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // New state to show a loading spinner!
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const handleSend = () => {
    if (text.trim() === "") return;
    onSendMessage(text);
    setText("");
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // STOP RECORDING
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // START RECORDING
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          setIsProcessing(true); // Turn on the loading spinner
          
          // 1. Package the audio
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          
          // 2. Prepare it for the API
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          try {
            // 3. Send it to Deepgram!
            const response = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
            });

            const data = await response.json();

            if (data.transcript) {
              // 4. Add the perfect text to the input box
              const spacer = text.length > 0 && !text.endsWith(" ") ? " " : "";
              setText(prev => prev + spacer + data.transcript);
            }
          } catch (error) {
            console.error("Deepgram transcription failed:", error);
          } finally {
            setIsProcessing(false); // Turn off the spinner
            stream.getTracks().forEach(track => track.stop()); // Shut off the mic light
          }
        };

        mediaRecorder.start();
        setIsRecording(true);

      } catch (err) {
        console.error("Microphone access denied:", err);
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
          disabled={isProcessing} // Lock the box while AI is thinking
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
           disabled={isProcessing}
           className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-md transition-all transform hover:scale-105 ${
             isRecording 
               ? "bg-red-500 shadow-red-500/40 animate-pulse" 
               : isProcessing
                 ? "bg-[#D59B87] opacity-70 cursor-not-allowed" // Loading state
                 : "bg-[#E2AD9A] shadow-[#E2AD9A]/40 hover:bg-[#D59B87]" 
           }`}
         >
           {isProcessing ? (
             <Loader2 className="w-6 h-6 animate-spin" /> // Spinning icon while transcribing
           ) : isRecording ? (
             <Square className="w-6 h-6" fill="currentColor" /> 
           ) : (
             <Mic className="w-6 h-6" />
           )}
         </button>

         <button className="w-12 h-12 rounded-full bg-[#F3EFEA] flex items-center justify-center text-[#7F7F7F] hover:bg-[#EAE5DF] transition-colors border border-[#E5E2DB]">
           <Volume2 className="w-5 h-5" />
         </button>
      </div>
    </div>
  );
}