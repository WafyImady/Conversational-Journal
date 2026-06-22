import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, emotions } = body;

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json({ error: "Invalid transcript." }, { status: 400 });
    }

    const formattedHistory = transcript
      .map((msg: any) => `${msg.role === "user" ? "User" : "Echo"}: ${msg.content}`)
      .join("\n");

    // 1. DEFINE THE STRICT JSON SCHEMA
    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        narrative: {
          type: SchemaType.STRING,
          description: "A cohesive, reflective 3-paragraph journal entry written from the first-person perspective of the User.",
        },
        actions: {
          type: SchemaType.ARRAY,
          description: "3 practical, actionable steps the user can take based on the journal entry.",
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

    // 2. PASS THE SCHEMA INTO THE MODEL CONFIG
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    // 3. THE PROMPT CAN NOW BE MUCH SIMPLER
    const prompt = `
    You are an expert AI journaling assistant. 
    Review the following chat transcript and the verified emotions for this session.

    Verified Emotions: ${emotions || "None specified"}
    
    Chat Transcript:
    ${formattedHistory}

    Based on the conversation, synthesize a first-person reflective journal entry and extract 3 actionable steps for the user's wellbeing.
    `;

    const result = await model.generateContent(prompt);
    
    // 4. NO MORE REGEX NEEDED! It is guaranteed to be clean JSON.
    const jsonResult = JSON.parse(result.response.text());

    return NextResponse.json(jsonResult);

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate narrative and actions." },
      { status: 500 }
    );
  }
}