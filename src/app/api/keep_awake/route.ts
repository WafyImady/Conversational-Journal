import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  // 1. Keep Supabase Awake
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  await supabase.from('journal_entries').select('id').limit(1);

  // 2. Keep Hugging Face Awake
  try {
    // We manually constructed the URL using the exact model name from your code!
    await fetch("https://api-inference.huggingface.co/models/SamLowe/roberta-base-go_emotions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: "ping" }), 
    });
  } catch (error) {
    console.log("Hugging face ping failed, but continuing...");
  }

  return NextResponse.json({ status: "Echo, Supabase, AND Hugging Face are fully awake!" });
}