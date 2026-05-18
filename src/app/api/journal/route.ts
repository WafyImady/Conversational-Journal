import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Initialize the AI using your secret key from .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    // 2. Select the model (Flash is perfect for fast, conversational responses)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 3. The System Prompt: This is where you program Echo's "personality"
    // 3. The Smart Prompt: Ask for the response AND the emotions in a specific format
    const systemPrompt = `You are Echo, an empathetic AI journaling companion. 
    A user is sharing a journal entry with you. 
    1. Respond naturally and kindly (2-3 sentences max).
    2. Analyze the text and provide 1-2 emotional tags (e.g., "Calm", "Anxious", "Productive").
    
    You MUST return your response as a valid JSON object exactly like this:
    {
      "reply": "Your empathetic response here.",
      "emotions": ["Tag1", "Tag2"]
    }`;

    // 4. Send the prompt
    const result = await model.generateContent(`${systemPrompt}\n\nUser Entry: "${text}"`);
    
    // 5. Parse the JSON that the AI returns
    const aiResponseText = result.response.text();
    // Sometimes the AI wraps JSON in markdown blocks, so we clean it first
    const cleanedText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedAI = JSON.parse(cleanedText);

    // 6. Send the dynamic response and dynamic emotions back!
    const mockResponse = {
      message: parsedAI.reply,
      detectedEmotions: parsedAI.emotions
    };

    return NextResponse.json(mockResponse);

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to connect to the AI brain." },
      { status: 500 }
    );
  }
}