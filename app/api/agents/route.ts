import { errorResponse, runResponse } from '@/lib/agents/http';
import { getRun, startRun } from '@/lib/agents/runner';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const assetId = new URL(request.url).searchParams.get('assetId') || 'AS-001';
  try {
    return runResponse(await getRun(assetId));
  } catch (error) {
    return errorResponse(error);
  }
}

// Starts a run, or retries a failed stage. The agents then advance through POST /api/agents/step.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const assetId = typeof body.assetId === 'string' ? body.assetId : 'AS-001';

  try {
    return runResponse(await startRun(assetId, { reset: body.reset === true }), 202);
  } catch (error) {
    return errorResponse(error);
  }
}
