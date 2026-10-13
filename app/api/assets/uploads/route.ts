import { NextResponse } from 'next/server';
import { UploadError, createPdfUpload } from '@/lib/assets/uploads';
import { StoreNotConfiguredError, assertWritableStore } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Prepares a PDF upload. With Supabase the browser gets a signed URL to upload to directly;
// in local development without it, the browser posts the file to /api/assets/extract instead.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const size = Number(body.size);

  try {
    assertWritableStore('PDF uploads');
    const upload = await createPdfUpload(size);
    return NextResponse.json(upload ? { mode: 'storage', ...upload } : { mode: 'direct' });
  } catch (error) {
    if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: 413 });
    if (error instanceof StoreNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    throw error;
  }
}
