import { NextResponse } from 'next/server';
import { getWorkflowForAsset } from '@/lib/workflow';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get('assetId') || 'AS-001';
  const workflow = getWorkflowForAsset(assetId);

  return NextResponse.json({ workflow });
}
