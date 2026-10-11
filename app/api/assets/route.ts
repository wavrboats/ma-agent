import { NextResponse } from 'next/server';
import { mockAssets, mockFindings, mockTasks } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({ assets: mockAssets, count: mockAssets.length });
}

export async function POST(request: Request) {
  const body = await request.json();

  const newAsset = {
    id: `AS-${String(mockAssets.length + 1).padStart(3, '0')}`,
    assetId: `AS-${String(mockAssets.length + 1).padStart(3, '0')}`,
    name: body.name || 'New Asset',
    assetClass: body.assetClass || 'Industrial Asset',
    country: body.country || 'Unknown',
    city: body.city || 'Unknown',
    address: body.address || 'Unknown',
    description: body.description || '',
    ownerObjective: body.ownerObjective || '',
    transactionType: body.transactionType || 'Asset Sale',
    operatingStatus: body.operatingStatus || 'Unknown',
    askingPrice: body.askingPrice ?? null,
    status: 'INTAKE',
    createdAt: new Date().toISOString(),
  };

  mockAssets.unshift(newAsset);

  return NextResponse.json({ asset: newAsset, status: 'created' }, { status: 201 });
}
