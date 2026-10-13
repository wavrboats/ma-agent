import { errorResponse, runResponse } from '@/lib/agents/http';
import { runStep } from '@/lib/agents/runner';

export const dynamic = 'force-dynamic';
// The most every Vercel plan allows. A step stops itself well before this and saves its progress.
export const maxDuration = 300;

// Runs the agents for up to a few minutes within this request, then returns the run.
// Call it again while the run's status is RUNNING; each call continues from the saved state.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const assetId = typeof body.assetId === 'string' ? body.assetId : 'AS-001';

  try {
    return runResponse(await runStep(assetId));
  } catch (error) {
    return errorResponse(error);
  }
}
