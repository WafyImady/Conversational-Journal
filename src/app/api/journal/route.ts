import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HfInference } from "@huggingface/inference";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;
    
    // 1. Grab the secure token from the frontend request
    const authHeader = request.headers.get("Authorization");

    // 2. Initialize Supabase WITH the user's secure token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "", 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", 
      {
        global: { headers: { Authorization: authHeader || "" } },
      }
    );

    // 3. Verify the user actually exists and grab their ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    let detectedEmotions = ["Reflective"]; 
    // Upgrade the default fallback message:
    let aiResponseText = "Thank you for sharing that with me. I'm currently taking a moment to process my thoughts, but I am listening. How else are you feeling today?";

    // --- BRAIN 1: DISTILBERT ---
    try {
      const hfResult = await hf.textClassification({
        model: 'bhadresh-savani/distilbert-base-uncased-emotion',
        inputs: text
      });
      if (hfResult && hfResult.length > 0) {
        detectedEmotions = hfResult.slice(0, 2).map(e => e.label.charAt(0).toUpperCase() + e.label.slice(1));
      }
    } catch (hfError) {
      console.warn("Hugging Face SDK warning:", hfError);
    }

    // --- BRAIN 2: GEMINI ---
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const systemPrompt = `You are Echo, an empathetic AI journaling companion... (acknowledge feelings briefly).`;
      const result = await model.generateContent(`${systemPrompt}\n\nUser Entry: "${text}"`);
      aiResponseText = result.response.text();
    } catch (geminiError: any) {
      console.warn("Gemini API overloaded:", geminiError.message);
    }

    // --- BRAIN 3: SUPABASE (Authenticated Insert) ---
    try {
      const { error } = await supabase
        .from('journal_entries')
        .insert([
          { 
            user_id: user.id, // WE NOW ATTACH THE SPECIFIC USER ID!
            user_text: text, 
            ai_reply: aiResponseText, 
            emotions: detectedEmotions.join(", ") 
          }
        ]);

      if (error) console.error("❌ Supabase Insert Error:", error.message);
      else console.log("✅ Successfully saved to Supabase Cloud for User:", user.email);
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
    }

    return NextResponse.json({ message: aiResponseText, detectedEmotions });

  } catch (error: any) {
    console.error("Critical System Error:", error);
    return NextResponse.json({ error: "System Crash" }, { status: 500 });
  }
}