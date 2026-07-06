export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import { createClient } from '@/utils/server';

// Initialize AI Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY || '');

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const latestText = body.text; 
    const transcript = body.transcript || []; 

    // Format the transcript into a readable chat log for Gemini
    const historyContext = transcript
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Echo'}: ${msg.content}`)
      .join('\n');

    // ---------------------------------------------------------
    // STEP 1: PREPARE THE PROMPTS AND PROMISES
    // ---------------------------------------------------------

    // A. Create the HuggingFace Promise (Runs in background)
    const hfPromise = hf.textClassification({
      model: 'SamLowe/roberta-base-go_emotions',
      inputs: latestText 
    })
    .then(result => result[0]?.label || 'Neutral')
    .catch(() => {
      console.log("HF API skipped/failed, defaulting to Neutral.");
      return 'Neutral';
    });

    // B. Build the Smart Gemini System Prompt
    const systemPrompt = `
      You are Echo, a warm, conversational, and deeply empathetic journaling companion.
      
      Here is our conversation history so far:
      ${historyContext}

      CRITICAL RULE FOR CLOSURE:
      Analyze the user's latest entry below. Determine if they are genuinely trying to say goodbye, sign off, wrap up the session, or go to sleep. 
      - IF THEY ARE SAYING GOODBYE: Provide a warm, comforting closing statement. DO NOT ASK ANY MORE QUESTIONS.
      - IF THEY ARE NOT SAYING GOODBYE (e.g., they are expressing that they CANNOT sleep, are struggling, or are just venting mid-paragraph): Continue the conversation naturally, validate their feelings, and support them.

      Keep your response natural, organic, and brief. Do not repeat questions you have already asked.

      User's Latest Entry: "${latestText}"
    `;

    // C. Create the Gemini Promise (With Fallback included)
    const geminiPromise = async () => {
      try {
        const primaryModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
        const result = await primaryModel.generateContent(systemPrompt);
        return result.response.text();
      } catch (primaryError: any) {
        console.warn("Primary Gemini model failed. Attempting fallback...");
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const fallbackResult = await fallbackModel.generateContent(systemPrompt);
        return fallbackResult.response.text();
      }
    };

    // ---------------------------------------------------------
    // STEP 2: RUN BOTH CONCURRENTLY (The Speed Boost)
    // ---------------------------------------------------------
    let primaryEmotion, aiNarrative;
    try {
      [primaryEmotion, aiNarrative] = await Promise.all([hfPromise, geminiPromise()]);
    } catch (error) {
      console.error("Gemini failed entirely:", error);
      return NextResponse.json({ 
        error: "Echo is currently overwhelmed by high demand. Please take a deep breath and try sending that again in a moment." 
      }, { status: 503 });
    }

    // ---------------------------------------------------------
    // STEP 3: RETURN THE DATA TO THE FRONTEND
    // ---------------------------------------------------------
    return NextResponse.json({ 
      success: true, 
      entry: {
        narrative: aiNarrative,
        emotions: [primaryEmotion]
      }
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}