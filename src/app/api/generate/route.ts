import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { createClient } from '@/utils/server'; // Make sure this import is here!

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. AUTH & DB SETUP
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const { transcript, emotions } = body;

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json({ error: "Invalid transcript." }, { status: 400 });
    }

    const formattedHistory = transcript
      .map((msg: any) => `${msg.role === "user" ? "User" : "Echo"}: ${msg.content}`)
      .join("\n");

    // 2. FETCH USER PREFERENCES FOR THE FINAL JOURNAL
    const { data: settings } = await supabase
      .from('user_settings')
      .select('narrative_style, response_length')
      .eq('user_id', user.id)
      .single();

    const style = settings?.narrative_style || 'Analytical';
    const length = settings?.response_length || 'Moderate';

    let stylePrompt = "";
    if (style === "Poetic") {
      stylePrompt = "Write the narrative using rich imagery, metaphors, and a poetic, reflective tone.";
    } else if (style === "Bulleted") {
      stylePrompt = "Write the narrative concisely. Use clear bullet points to summarize the main thoughts.";
    } else {
      stylePrompt = "Write the narrative objectively, breaking down behavioral patterns and cognitive shifts.";
    }

    let lengthPrompt = "";
    if (length === "Concise") {
      lengthPrompt = "Keep the narrative extremely brief, around 50 words max.";
    } else if (length === "Detailed") {
      lengthPrompt = "Provide a deep, thorough, and highly detailed narrative, around 200 words.";
    } else {
      lengthPrompt = "Keep the narrative balanced, around 100 words.";
    }

    // 3. DEFINE THE STRICT JSON SCHEMA
    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        narrative: {
          type: SchemaType.STRING,
          description: "A cohesive journal entry written from the first-person perspective of the User.",
        },
        actions: {
          type: SchemaType.ARRAY,
          description: "3 practical, actionable steps the user can take.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.INTEGER },
              title: { type: SchemaType.STRING },
              desc: { type: SchemaType.STRING },
              completed: { type: SchemaType.BOOLEAN },
            },
            required: ["id", "title", "desc", "completed"],
          },
        },
      },
      required: ["narrative", "actions"],
    };

    // 4. THE UPGRADED PROMPT
    const prompt = `
    You are an expert AI journaling assistant. 
    Review the following chat transcript and the verified emotions for this session.

    Verified Emotions: ${emotions || "None specified"}
    
    Personality Rules for Narrative: ${stylePrompt}
    Length Constraint for Narrative: ${lengthPrompt}

    Chat Transcript:
    ${formattedHistory}

    Based on the conversation, synthesize a first-person reflective journal entry following the Personality and Length rules perfectly. Then, extract 3 actionable steps.
    `;

    // 5. GENERATE WITH AUTOMATIC FALLBACK
    let jsonResult;

    try {
      const primaryModel = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });
      const result = await primaryModel.generateContent(prompt);
      jsonResult = JSON.parse(result.response.text());

    } catch (primaryError: any) {
      console.warn("Primary generation failed. Attempting fallback...");
      
      try {
        const fallbackModel = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash", 
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          }
        });
        const fallbackResult = await fallbackModel.generateContent(prompt);
        jsonResult = JSON.parse(fallbackResult.response.text());

      } catch (fallbackError: any) {
        return NextResponse.json(
          { error: "Echo is overwhelmed right now. Please try generating again in a moment." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(jsonResult);

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate narrative and actions." },
      { status: 500 }
    );
  }
}