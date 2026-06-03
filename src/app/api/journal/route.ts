import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HfInference } from "@huggingface/inference";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Accept the FULL array from the frontend, not just a single text string
    const { transcript } = body;
    
    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json({ error: "Invalid transcript array." }, { status: 400 });
    }

    // 2. Prep the data for the two different AI brains
    const latestText = transcript[transcript.length - 1].content;
    const formattedHistory = transcript
      .map((msg) => `${msg.role === "user" ? "User" : "Echo"}: ${msg.content}`)
      .join("\n");

    let detectedEmotions = ["Reflective"]; 
    let aiResponseText = "Thank you for sharing that with me. I'm currently taking a moment to process my thoughts, but I am listening. How else are you feeling today?";

    // --- BRAIN 1: DISTILBERT (The Classifier) ---
    try {
      const hfResult = await hf.textClassification({
        model: 'bhadresh-savani/distilbert-base-uncased-emotion',
        inputs: latestText 
      });
      
      if (hfResult && hfResult.length > 0) {
        // THE FIX: Filter out low-confidence guesses before slicing!
        const confidentEmotions = hfResult.filter((e: any) => e.score > 0.3); // Must be > 30% sure
        
        if (confidentEmotions.length > 0) {
          detectedEmotions = confidentEmotions
            .slice(0, 2)
            .map((e: any) => e.label.charAt(0).toUpperCase() + e.label.slice(1));
        } else {
          // If no emotions pass the threshold (like "hi there"), return empty so it doesn't tag!
          detectedEmotions = []; 
        }
      }
    } catch (hfError) {
      console.warn("Hugging Face SDK warning:", hfError);
    }

    // --- BRAIN 2: GEMINI (The Conversationalist) ---
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
      
      // Gemini gets the entire conversation history so it remembers the context
      const systemPrompt = `You are Echo, an empathetic AI journaling companion. Read the conversation history below and reply to the User's latest message naturally and briefly.\n\nHistory:\n${formattedHistory}`;
      
      const result = await model.generateContent(systemPrompt);
      aiResponseText = result.response.text();
    } catch (geminiError: any) {
      console.warn("Gemini API overloaded:", geminiError.message);
    }

    // 3. Return the payload to the frontend! (Notice: No database inserts here!)
    return NextResponse.json({ message: aiResponseText, detectedEmotions });

  } catch (error: any) {
    console.error("Critical System Error:", error);
    return NextResponse.json({ error: "System Crash" }, { status: 500 });
  }
}