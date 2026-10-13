import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { ExtractionError, IMAGE_TYPES, extractAssetFromFile } from '@/lib/assets/extract';
import type { ReadableType } from '@/lib/assets/extract';
import { MAX_UPLOAD_BYTES, UploadError, removeUploadedPdf, takeUploadedPdf } from '@/lib/assets/uploads';

export const dynamic = 'force-dynamic';
// A long PDF can take Claude a few minutes to read.
export const maxDuration = 300;

const readableType = (file: File): ReadableType | null => {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'application/pdf';
  return (IMAGE_TYPES as readonly string[]).includes(file.type) ? (file.type as ReadableType) : null;
};

// Reads a PDF or photo with Claude and returns the asset intake fields it states. A large PDF arrives
// as a Supabase Storage upload ({ path }); photos, which the browser shrinks first, and PDFs in local
// development are posted directly.
export async function POST(request: Request) {
  let data: Buffer;
  let mediaType: ReadableType = 'application/pdf';
  let uploadPath: string | undefined;

  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      if (typeof body.path !== 'string') return NextResponse.json({ error: 'Missing upload path.' }, { status: 400 });
      uploadPath = body.path;
      data = await takeUploadedPdf(body.path);
    } else {
      const form = await request.formData().catch(() => null);
      const file = form?.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'Attach a PDF or a photo.' }, { status: 400 });
      const type = readableType(file);
      if (!type) return NextResponse.json({ error: 'Only PDFs and JPEG, PNG, WebP or GIF photos can be read.' }, { status: 415 });
      if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'Files can be up to 20 MB.' }, { status: 413 });
      mediaType = type;
      data = Buffer.from(await file.arrayBuffer());
    }

    const fields = await extractAssetFromFile(data, mediaType);
    return NextResponse.json({ fields });
  } catch (error) {
    if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof ExtractionError) return NextResponse.json({ error: error.message }, { status: 422 });
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Claude API error ${error.status}: ${error.message}` }, { status: 502 });
    }
    throw error;
  } finally {
    // The upload is only needed for this read.
    if (uploadPath) await removeUploadedPdf(uploadPath).catch(() => undefined);
  }
}
