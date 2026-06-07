import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import { createClient } from '@/utils/server';

// Initialize AI Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY || '');

export async function POST(req: Request) {
  try {
    // 1. Initialize the secure server client
    const supabase = await createClient();

    // 2. Ask Supabase who is currently logged in based on the cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 3. If no one is logged in, block the request immediately
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // 4. We now have our real, secure User ID!
    const REAL_USER_ID = user.id; 

    const body = await req.json();
    const latestText = body.text; 

    // ... The rest of your code remains exactly the same! 
    // Just remember to change PROTOTYPE_USER_ID to REAL_USER_ID
    // in your STEP 1 (select settings) and STEP 5 (insert journal) queries.

    // ---------------------------------------------------------
    // STEP 1: FETCH USER PREFERENCES
    // ---------------------------------------------------------
    const { data: settings } = await supabase
      .from('user_settings')
      .select('narrative_style, response_length')
      .eq('user_id', REAL_USER_ID)
      .single();

    // Set safe defaults just in case they haven't saved settings yet
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

    // Combine everything into the hidden System Instruction
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
    // STEP 5: SAVE EVERYTHING TO SUPABASE
    // ---------------------------------------------------------
    const { data: savedEntry, error: dbError } = await supabase
      .from('journal_entries')
      .insert({
        user_id: REAL_USER_ID,
        user_text: latestText,
        emotions: primaryEmotion,
        narrative: aiNarrative,
        status: 'completed'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Return the successful data to your frontend
    return NextResponse.json({ success: true, entry: savedEntry });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}