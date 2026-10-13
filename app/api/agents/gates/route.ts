import { NextResponse } from 'next/server';
import { errorResponse, runResponse } from '@/lib/agents/http';
import { decideGate } from '@/lib/agents/runner';
import type { GateCode } from '@/lib/pipeline';

const GATES: GateCode[] = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5'];

// Records a human gate decision. Approval lets the run continue through POST /api/agents/step; rejection stops it.
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
    return runResponse(await decideGate(assetId, gate, decision, decidedBy.trim(), typeof notes === 'string' ? notes : undefined));
  } catch (error) {
    return errorResponse(error);
  }
}
