import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { ExtractionError, MAX_PDF_BYTES, extractAssetFromPdf } from '@/lib/assets/extract';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const isPdf = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

// Reads an uploaded PDF with Claude and returns the asset intake fields it states.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');

  if (!(file instanceof File)) return NextResponse.json({ error: 'Attach a PDF file.' }, { status: 400 });
  if (!isPdf(file)) return NextResponse.json({ error: 'Only PDF files can be read here.' }, { status: 415 });
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: 'This PDF is larger than 4 MB. Upload a smaller or compressed copy.' }, { status: 413 });
  }

  try {
    const fields = await extractAssetFromPdf(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ fields });
  } catch (error) {
    if (error instanceof ExtractionError) return NextResponse.json({ error: error.message }, { status: 422 });
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Claude API error ${error.status}: ${error.message}` }, { status: 502 });
    }
    throw error;
  }
}
