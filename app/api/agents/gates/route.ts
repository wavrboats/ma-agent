import { NextResponse } from 'next/server';
import { PipelineError, decideGate } from '@/lib/agents/runner';
import type { GateCode } from '@/lib/pipeline';

const GATES: GateCode[] = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5'];

// Records a human gate decision. Approval resumes the pipeline; rejection stops it.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { assetId, gate, decision, decidedBy, notes } = body;

  if (typeof assetId !== 'string' || !GATES.includes(gate) || !['APPROVED', 'REJECTED'].includes(decision)) {
    return NextResponse.json({ error: 'assetId, gate (G0–G5) and decision (APPROVED or REJECTED) are required.' }, { status: 400 });
  }
  if (typeof decidedBy !== 'string' || decidedBy.trim() === '') {
    return NextResponse.json({ error: 'decidedBy is required: a gate decision must name the person who made it.' }, { status: 400 });
  }

  try {
    const run = await decideGate(assetId, gate, decision, decidedBy.trim(), typeof notes === 'string' ? notes : undefined);
    return NextResponse.json({ run });
  } catch (error) {
    if (error instanceof PipelineError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
