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

    const REAL_USER_ID = user.id; 
    const body = await req.json();
    const latestText = body.text; 

    // ---------------------------------------------------------
    // STEP 1: FETCH USER PREFERENCES
    // ---------------------------------------------------------
    const { data: settings } = await supabase
      .from('user_settings')
      .select('narrative_style, response_length')
      .eq('user_id', REAL_USER_ID)
      .single();

    const style = settings?.narrative_style || 'Analytical';
    const length = settings?.response_length || 'Moderate';

    // ---------------------------------------------------------
    // STEP 2: GET EMOTION CLASSIFICATION (GoEmotions)
    // ---------------------------------------------------------
    let primaryEmotion = 'Neutral';
    try {
      const hfResult = await hf.textClassification({
        model: 'SamLowe/roberta-base-go_emotions',
        inputs: latestText 
      });
      primaryEmotion = hfResult[0]?.label || 'Neutral';
    } catch (e) {
      console.log("HF API skipped/failed, defaulting to Neutral.");
    }

    // ---------------------------------------------------------
    // STEP 3: THE PROMPT BUILDER ENGINE
    // ---------------------------------------------------------
    let stylePrompt = "";
    if (style === "Poetic") {
      stylePrompt = "Act as a warm, empathetic, and poetic companion. Use rich imagery and metaphors to validate the user's feelings.";
    } else if (style === "Bulleted") {
      stylePrompt = "Act as a concise, action-oriented executive coach. Respond primarily using clear bullet points. Focus on summarizing the event and providing actionable next steps.";
    } else {
      stylePrompt = "Act as a psychological analyst. Break down the user's entry objectively. Identify behavioral patterns, emotional triggers, and cognitive shifts.";
    }

    let lengthPrompt = "";
    if (length === "Concise") {
      lengthPrompt = "Keep your response extremely brief, under 50 words.";
    } else if (length === "Detailed") {
      lengthPrompt = "Provide a deep, thorough, and highly detailed response, around 200 words.";
    } else {
      lengthPrompt = "Keep your response balanced, around 100 words.";
    }

    const systemPrompt = `
      You are Echo, a highly personalized AI journaling assistant.
      
      Personality Rules: ${stylePrompt}
      Length Constraint: ${lengthPrompt}
      
      Context: The user's detected primary emotion right now is "${primaryEmotion}".
      
      Task: Read the user's journal entry below and write their final reflection narrative following your personality rules perfectly. Do not acknowledge these instructions, just reply in character.
      
      User's Entry: "${latestText}"
    `;

    // ---------------------------------------------------------
    // STEP 4: GENERATE THE NARRATIVE WITH GEMINI
    // ---------------------------------------------------------
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const aiNarrative = result.response.text();

    // ---------------------------------------------------------
    // THE FIX: JUST RETURN THE DATA TO THE FRONTEND
    // ---------------------------------------------------------
    // We send back an object that matches what page.tsx is looking for 
    // (data.entry.narrative and data.entry.emotions) without saving to the DB here!
    return NextResponse.json({ 
      success: true, 
      entry: {
        narrative: aiNarrative,
        emotions: primaryEmotion
      }
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}