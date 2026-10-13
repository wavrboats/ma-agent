import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { AgentRunState } from '@/lib/agents/types';

// Run state lives in memory and is mirrored to .data/agent-runs/<assetId>.json so it survives
// dev-server reloads. Swap this module for the Supabase tables when persistence is wired up.
const DATA_DIR = path.join(process.cwd(), '.data', 'agent-runs');

const globalStore = globalThis as unknown as { agentRuns?: Map<string, AgentRunState> };
const runs = (globalStore.agentRuns ??= new Map<string, AgentRunState>());

const fileFor = (assetId: string) => path.join(DATA_DIR, `${assetId.replace(/[^A-Za-z0-9_-]/g, '_')}.json`);

export const newRunState = (assetId: string): AgentRunState => ({
  assetId,
  status: 'IDLE',
  currentStage: 'INTAKE',
  stages: {},
  findings: [],
  risks: [],
  missingDocuments: [],
  gates: {},
  log: [],
  updatedAt: new Date().toISOString(),
});

export async function loadRun(assetId: string): Promise<AgentRunState> {
  const cached = runs.get(assetId);
  if (cached) return cached;

  try {
    const state = JSON.parse(await readFile(fileFor(assetId), 'utf8')) as AgentRunState;
    // A run that was mid-flight when the server stopped cannot resume its model call.
    if (state.status === 'RUNNING') {
      state.status = 'FAILED';
      state.error = 'The server restarted while this run was in progress. Run it again to retry the stage.';
    }
    runs.set(assetId, state);
    return state;
  } catch {
    const state = newRunState(assetId);
    runs.set(assetId, state);
    return state;
  }
}

export async function saveRun(state: AgentRunState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  runs.set(state.assetId, state);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(fileFor(state.assetId), JSON.stringify(state, null, 2));
}
