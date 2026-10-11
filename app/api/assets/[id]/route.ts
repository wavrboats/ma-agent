import { NextResponse } from 'next/server';
import { mockAssets, mockFindings, mockTasks } from '@/lib/mock-data';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const asset = mockAssets.find((item) => item.id === params.id || item.assetId === params.id);

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const tasks = mockTasks.filter((task) => task.assetId === asset.assetId);
  const findings = mockFindings.filter((finding) => finding.assetId === asset.assetId);

  return NextResponse.json({ asset, tasks, findings });
}
