import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are an expert AI journaling assistant. 
    Review the following chat transcript and the verified emotions for this session.

    Verified Emotions: ${emotions || "None specified"}
    
    Chat Transcript:
    ${formattedHistory}

    INSTRUCTIONS:
    1. Synthesize the conversation into a cohesive, reflective 3-paragraph journal entry. It MUST be written from the first-person perspective of the User (e.g., "Today I felt...", "I realized that...").
    2. Based on the conversation, extract 3 practical, actionable steps the user can take to improve their wellbeing or situation.

    You MUST respond EXACTLY in this JSON format. Do not include markdown formatting like \`\`\`json.
    {
      "narrative": "Paragraph 1\\n\\nParagraph 2\\n\\nParagraph 3",
      "actions": [
        { "id": 1, "title": "Action Title", "desc": "Brief description of the action", "completed": false },
        { "id": 2, "title": "Action Title", "desc": "Brief description of the action", "completed": false },
        { "id": 3, "title": "Action Title", "desc": "Brief description of the action", "completed": false }
      ]
    }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean potential markdown tags from the response
    const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonResult = JSON.parse(cleanedText);

    return NextResponse.json(jsonResult);

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate narrative and actions." },
      { status: 500 }
    );
  }
}