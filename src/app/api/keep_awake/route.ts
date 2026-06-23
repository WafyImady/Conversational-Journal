import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Or however you import your Supabase client

export async function GET() {
  // Initialize Supabase using your environment variables
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Perform a tiny read to keep the database active
  // IMPORTANT: Replace 'journal_entries' with the name of a real table in your database
  const { data, error } = await supabase
    .from('journal_entries') 
    .select('id')
    .limit(1);

  if (error) {
    return NextResponse.json({ status: "Vercel awake, but Supabase error", error }, { status: 500 });
  }

  return NextResponse.json({ status: "Echo and Supabase are fully awake!" });
}