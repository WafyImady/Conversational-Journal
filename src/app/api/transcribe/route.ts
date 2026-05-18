import { NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";

// 1. Initialize Deepgram using the newest SDK class constructor
const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY || "" });

export async function POST(request: Request) {
  try {
    // 2. Grab the audio file sent from the frontend
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // 3. Convert the file into a buffer that Deepgram can read
    const buffer = Buffer.from(await audioFile.arrayBuffer());

    // 4. Send to Deepgram Nova-3 using the updated media API layout
    const response = await deepgram.listen.v1.media.transcribeFile(
      buffer,
      {
        model: "nova-3",
        smart_format: true, // ✅ FIX 1: Changed from "true" string to actual boolean true
      }
    );

    // 5. Extract the text from the updated response data structure
    // ✅ FIX 2: Cast the response to 'any' to bypass strict union checking for the prototype
    const apiResult = response as any;
    const transcript = apiResult.results?.channels[0]?.alternatives[0]?.transcript || "";

    // 6. Send the text back to the browser
    return NextResponse.json({ transcript });

  } catch (error) {
    console.error("Transcription Error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio." },
      { status: 500 }
    );
  }
}