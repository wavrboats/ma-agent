import { NextResponse } from 'next/server';
import { PipelineError, getRun, startRun } from '@/lib/agents/runner';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const assetId = new URL(request.url).searchParams.get('assetId') || 'AS-001';
  return NextResponse.json({ run: await getRun(assetId) });
}

// Starts or resumes the agents for an asset. They keep working in the background; poll GET for progress.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const assetId = typeof body.assetId === 'string' ? body.assetId : 'AS-001';

  try {
    const run = await startRun(assetId, { reset: body.reset === true });
    return NextResponse.json({ run }, { status: 202 });
  } catch (error) {
    if (error instanceof PipelineError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
