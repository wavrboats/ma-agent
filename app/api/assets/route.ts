import { NextResponse } from 'next/server';
import { mockAssets } from '@/lib/types';
import { getWorkflowForAsset } from '@/lib/workflow';

export async function GET() {
  return NextResponse.json({ assets: mockAssets });
}

export async function POST(request: Request) {
  const body = await request.json();

  const newAsset = {
    id: `AS-${String(mockAssets.length + 1).padStart(3, '0')}`,
    assetId: `AS-${String(mockAssets.length + 1).padStart(3, '0')}`,
    name: body.name || 'New Asset',
    assetClass: body.assetClass || 'Industrial Asset',
    country: body.country || 'Unknown',
    city: body.city || '',
    address: body.address || '',
    description: body.description || '',
    ownerObjective: body.ownerObjective || '',
    transactionType: body.transactionType || 'Asset Sale',
    operatingStatus: body.operatingStatus || 'Unknown',
    askingPrice: body.askingPrice ?? null,
    status: 'INTAKE',
    createdAt: new Date().toISOString().slice(0, 10),
  };

  mockAssets.unshift(newAsset);

  return NextResponse.json({ asset: newAsset, workflow: getWorkflowForAsset(newAsset.assetId) }, { status: 201 });
}
