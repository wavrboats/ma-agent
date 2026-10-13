import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Tells the intake form what this deployment can do, so it can work without keys:
// - ai: Claude can read PDFs and photos into the form.
// - assetStore: where saved assets go. "none" (Vercel without Supabase) means the form saves on the device.
// - attachments: photos and PDFs can be kept with the asset on the server.
export async function GET() {
  const supabase = Boolean(getServerSupabase());
  return NextResponse.json({
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    assetStore: supabase ? 'supabase' : process.env.VERCEL ? 'none' : 'local-file',
    attachments: supabase,
  });
}
