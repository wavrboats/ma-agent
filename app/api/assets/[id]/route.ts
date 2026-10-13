import { NextResponse } from 'next/server';
import { getAsset } from '@/lib/assets/store';
import { getWorkflowForAsset, createCEOReport } from '@/lib/workflow';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const asset = await getAsset(params.id);

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const workflow = getWorkflowForAsset(asset.assetId);
  const report = createCEOReport(asset.assetId, workflow.findings);

  return NextResponse.json({ asset, workflow, report });
}
