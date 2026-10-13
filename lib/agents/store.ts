import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { AgentRunState } from '@/lib/agents/types';
import { assertWritableStore, getServerSupabase } from '@/lib/supabase-server';

export { StoreNotConfiguredError } from '@/lib/supabase-server';

// Run state is kept in Supabase (table agent_run_states) when it is configured. Without it, local
// development falls back to .data/agent-runs/<assetId>.json. Serverless hosts such as Vercel have no
// shared, writable disk, so there Supabase is required.

const TABLE = 'agent_run_states';
const DATA_DIR = path.join(process.cwd(), '.data', 'agent-runs');

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
  assertWritableStore('Agent runs');
  const db = getServerSupabase();

  if (db) {
    const { data, error } = await db.from(TABLE).select('state').eq('asset_id', assetId).maybeSingle();
    if (error) throw new Error(`Could not load the agent run: ${error.message}`);
    return (data?.state as AgentRunState | undefined) ?? newRunState(assetId);
  }

  try {
    return JSON.parse(await readFile(fileFor(assetId), 'utf8')) as AgentRunState;
  } catch {
    return newRunState(assetId);
  }
}

export async function saveRun(state: AgentRunState): Promise<void> {
  assertWritableStore('Agent runs');
  state.updatedAt = new Date().toISOString();
  const db = getServerSupabase();

  if (db) {
    const { error } = await db
      .from(TABLE)
      .upsert({ asset_id: state.assetId, state, updated_at: state.updatedAt }, { onConflict: 'asset_id' });
    if (error) throw new Error(`Could not save the agent run: ${error.message}`);
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(fileFor(state.assetId), JSON.stringify(state, null, 2));
}
