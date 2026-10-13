import { AgentConsole } from '@/components/agent-console';
import { listAssets } from '@/lib/assets/store';

export const dynamic = 'force-dynamic';

export default async function AgentsPage({ searchParams }: { searchParams: { assetId?: string } }) {
  const assets = (await listAssets()).map(({ assetId, name }) => ({ assetId, name }));
  const initialAssetId = assets.some((asset) => asset.assetId === searchParams.assetId) ? searchParams.assetId : undefined;
  return <AgentConsole assets={assets} initialAssetId={initialAssetId} />;
}
