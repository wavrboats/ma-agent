import { NextResponse } from 'next/server';
import { mockAssets } from '@/lib/types';
import { getWorkflowForAsset, createCEOReport } from '@/lib/workflow';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const asset = mockAssets.find((item) => item.id === params.id || item.assetId === params.id);

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const workflow = getWorkflowForAsset(asset.assetId);
  const report = createCEOReport(asset.assetId, workflow.findings);

  return NextResponse.json({ asset, workflow, report });
}
