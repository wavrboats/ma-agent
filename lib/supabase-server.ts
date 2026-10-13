import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase access with the service-role key. Returns undefined when Supabase is not
// configured, so callers can fall back to local files in development.

export class StoreNotConfiguredError extends Error {}

let client: SupabaseClient | undefined;

export function getServerSupabase(): SupabaseClient | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return undefined;
  return (client ??= createClient(url, key, { auth: { persistSession: false } }));
}

// Serverless hosts such as Vercel have no shared, writable disk, so saving there needs Supabase.
export function assertWritableStore(what: string) {
  if (!getServerSupabase() && process.env.VERCEL) {
    throw new StoreNotConfiguredError(
      `${what} need Supabase on Vercel. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and apply supabase/schema.sql.`,
    );
  }
}
