import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// === NEW: Force Next.js to skip this during build ===
export const dynamic = 'force-dynamic'; 
// ====================================================

// === UPDATED: Add a fallback string to prevent crashes ===
const resend = new Resend(process.env.RESEND_API_KEY || 'default_key');
// =========================================================

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET(request: Request) {
  
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  

  try {
    // 1. Map JavaScript days (0-6) to your custom UI IDs
    const daysMap = ["S1", "M", "T1", "W", "T2", "F", "S2"];
    const currentDayIndex = new Date().getDay();
    const todayId = daysMap[currentDayIndex]; 

    // 2. Query Supabase for users who opted in AND selected today
    const { data: users, error } = await supabaseAdmin
      .from('user_settings')
      .select('user_id, display_name, active_days') 
      .eq('email_enabled', true)
      .contains('active_days', [todayId]); // Only grabs rows where the array includes today's ID

    if (error) throw error;
    if (!users || users.length === 0) {
      return NextResponse.json({ message: `No reminders scheduled for today (${todayId}).` });
    }

    // 3. Send the emails
    for (const user of users) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.user_id);
      const targetEmail = authData?.user?.email;

      if (authError || !targetEmail) {
        console.error(`Could not find email for user: ${user.user_id}`);
        continue; 
      }

      // === NEW: Mini safety net just for Resend ===
      try {
        await resend.emails.send({
          from: 'Echo Journal <onboarding@resend.dev>', 
          to: targetEmail, 
          subject: 'Time to reflect with Echo 🌙',
          html: `
            <div style="font-family: sans-serif; color: #333; padding: 20px;">
              <h2 style="color: #5A7A62;">Hello ${user.display_name || 'there'}!</h2>
              <p>Just a gentle reminder that it is time for your daily reflection.</p>
              <p>Take a few minutes to unload your thoughts and let Echo analyze your day.</p>
              <a href="https://conversational-journal.vercel.app/" style="display: inline-block; background-color: #5A7A62; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; margin-top: 10px;">
                Open Echo
              </a>
            </div>
          `
        });
      } catch (sendError) {
        // If Resend blocks your friend, it just prints this line and peacefully continues to the next user!
        console.warn(`Resend blocked email to ${targetEmail}. Moving to next user...`);
      }
      // ===========================================
    }

    return NextResponse.json({ 
      success: true, 
      emailsSent: users.length, 
      dayProcessed: todayId 
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}