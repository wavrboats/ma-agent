import { NextResponse } from 'next/server';
import { UploadError, createSignedUpload } from '@/lib/assets/uploads';
import type { UploadKind } from '@/lib/assets/uploads';

export const dynamic = 'force-dynamic';

// Prepares an upload: a PDF for Claude to read ("read"), or a photo or PDF to keep with the asset
// ("attach"). With Supabase the browser gets a signed URL to upload to directly; without it the
// response is { mode: 'direct' } and the browser posts a file to read to /api/assets/extract instead.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const kind: UploadKind = body.kind === 'attach' ? 'attach' : 'read';
  const contentType = typeof body.contentType === 'string' ? body.contentType : 'application/pdf';

  try {
    const upload = await createSignedUpload(kind, Number(body.size), contentType);
    return NextResponse.json(upload ? { mode: 'storage', ...upload } : { mode: 'direct' });
  } catch (error) {
    if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: 413 });
    throw error;
  }
}
