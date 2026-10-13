import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { ExtractionError, extractAssetFromPdf } from '@/lib/assets/extract';
import { MAX_UPLOAD_BYTES, UploadError, removeUploadedPdf, takeUploadedPdf } from '@/lib/assets/uploads';

export const dynamic = 'force-dynamic';
// A long PDF can take Claude a few minutes to read.
export const maxDuration = 300;

const isPdf = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

// Reads a PDF with Claude and returns the asset intake fields it states. The PDF is either a
// Supabase Storage upload ({ path }) or, in local development, the posted file itself.
export async function POST(request: Request) {
  let pdf: Buffer;
  let uploadPath: string | undefined;

  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      if (typeof body.path !== 'string') return NextResponse.json({ error: 'Missing upload path.' }, { status: 400 });
      uploadPath = body.path;
      pdf = await takeUploadedPdf(body.path);
    } else {
      const form = await request.formData().catch(() => null);
      const file = form?.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'Attach a PDF file.' }, { status: 400 });
      if (!isPdf(file)) return NextResponse.json({ error: 'Only PDF files can be read here.' }, { status: 415 });
      if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'PDFs can be up to 20 MB.' }, { status: 413 });
      pdf = Buffer.from(await file.arrayBuffer());
    }

    const fields = await extractAssetFromPdf(pdf);
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
