import { AgentConsole } from '@/components/agent-console';
import { mockAssets } from '@/lib/types';

export default function AgentsPage() {
  return <AgentConsole assets={mockAssets.map(({ assetId, name }) => ({ assetId, name }))} />;
}
