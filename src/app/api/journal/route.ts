import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HfInference } from "@huggingface/inference";
import { createClient } from "@supabase/supabase-js";

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    let detectedEmotions = ["Reflective"]; 
    let aiResponseText = "I hear you.";

    // --- BRAIN 1: DISTILBERT (Emotion Classification) ---
    try {
      const hfResult = await hf.textClassification({
        model: 'bhadresh-savani/distilbert-base-uncased-emotion',
        inputs: text
      });

      if (hfResult && hfResult.length > 0) {
        detectedEmotions = hfResult.slice(0, 2).map(e => 
          e.label.charAt(0).toUpperCase() + e.label.slice(1)
        );
      }
    } catch (hfError) {
      console.warn("Hugging Face SDK warning:", hfError);
    }

    // --- BRAIN 2: GEMINI (Empathetic Reply) ---
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const systemPrompt = `You are Echo, an empathetic AI journaling companion. 
      A user is sharing a journal entry with you. 
      Respond naturally, kindly, and briefly (2-3 sentences max). 
      Acknowledge their feelings and ask one gentle follow-up question to help them reflect.`;

      const result = await model.generateContent(`${systemPrompt}\n\nUser Entry: "${text}"`);
      aiResponseText = result.response.text();
    } catch (geminiError: any) {
      console.warn("Gemini API is temporarily overloaded:", geminiError.message);
    }

    // --- BRAIN 3: SUPABASE (The Memory Bank) ---
    try {
      const { error } = await supabase
        .from('journal_entries')
        .insert([
          { 
            user_text: text, 
            ai_reply: aiResponseText, 
            emotions: detectedEmotions.join(", ") 
          }
        ]);

      if (error) {
        console.error("❌ Supabase Insert Error:", error.message);
      } else {
        console.log("✅ Successfully saved to Supabase Cloud!");
      }
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
    }

    // --- THE MERGE ---
    return NextResponse.json({
      message: aiResponseText,
      detectedEmotions: detectedEmotions 
    });

  } catch (error: any) {
    console.error("Critical System Error:", error);
    return NextResponse.json(
      { error: "System Crash" },
      { status: 500 }
    );
  }
}