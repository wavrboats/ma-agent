import { NextResponse } from 'next/server';
import { PipelineError, publicRun } from '@/lib/agents/runner';
import { StoreNotConfiguredError } from '@/lib/agents/store';
import type { AgentRunState } from '@/lib/agents/types';

export const runResponse = (run: AgentRunState, status = 200) => NextResponse.json({ run: publicRun(run) }, { status });

// Maps the agent layer's expected errors to HTTP responses; anything else is a real 500.
export function errorResponse(error: unknown) {
  if (error instanceof PipelineError) return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof StoreNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
  throw error;
}
