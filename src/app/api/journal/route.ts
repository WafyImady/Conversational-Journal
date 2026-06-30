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
    const transcript = body.transcript || []; // <-- NEW: Grabs the conversation history

    // ---------------------------------------------------------
    // STEP 1: GET EMOTION CLASSIFICATION (GoEmotions)
    // ---------------------------------------------------------
    let primaryEmotion = 'Neutral';
    try {
      // We only test the latest text so the emotion is accurate to the current moment
      const hfResult = await hf.textClassification({
        model: 'SamLowe/roberta-base-go_emotions',
        inputs: latestText 
      });
      primaryEmotion = hfResult[0]?.label || 'Neutral';
    } catch (e) {
      console.log("HF API skipped/failed, defaulting to Neutral.");
    }

    // ---------------------------------------------------------
    // STEP 2: THE CONVERSATIONAL PROMPT
    // ---------------------------------------------------------
    // <-- NEW: Format the transcript into a readable chat log for Gemini
    const historyContext = transcript
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Echo'}: ${msg.content}`)
      .join('\n');

    const systemPrompt = `
      You are Echo, a warm and empathetic journaling companion.
      Context: The user's detected primary emotion right now is "${primaryEmotion}".
      
      Here is the conversation history so far:
      ${historyContext}

      Task: Based on the conversation history above, reply directly to the user's latest message below. Keep it natural, conversational, and relatively brief. Do not repeat questions you have already asked.
  
      User's Latest Entry: "${latestText}"
    `;

    // ---------------------------------------------------------
    // STEP 3: GENERATE THE CHAT RESPONSE (WITH FALLBACK)
    // ---------------------------------------------------------
    let aiNarrative = "";

    try {
      // First attempt: Try the primary model
      const primaryModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
      const result = await primaryModel.generateContent(systemPrompt);
      aiNarrative = result.response.text();

    } catch (primaryError: any) {
      console.warn("Primary Gemini model failed (likely 503). Attempting fallback...", primaryError.message);
      
      try {
        // Second attempt: Automatically fall back to the highly stable 2.5 model
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const fallbackResult = await fallbackModel.generateContent(systemPrompt);
        aiNarrative = fallbackResult.response.text();

      } catch (fallbackError: any) {
        console.error("Both Gemini models failed:", fallbackError.message);
        // Safely tell the frontend there is a traffic jam instead of crashing
        return NextResponse.json({ 
          error: "Echo is currently overwhelmed by high demand. Please take a deep breath and try sending that again in a moment." 
        }, { status: 503 });
      }
    }

    // ---------------------------------------------------------
    // RETURN THE DATA TO THE FRONTEND
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