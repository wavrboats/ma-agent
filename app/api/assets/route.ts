import { NextResponse } from 'next/server';
import { createAsset, listAssets } from '@/lib/assets/store';
import { StoreNotConfiguredError } from '@/lib/supabase-server';
import { getWorkflowForAsset } from '@/lib/workflow';

export const dynamic = 'force-dynamic';

const FIELDS = [
  'name',
  'assetClass',
  'country',
  'city',
  'address',
  'industry',
  'description',
  'ownerObjective',
  'transactionType',
  'operatingStatus',
  'askingPrice',
] as const;

export async function GET() {
  return NextResponse.json({ assets: await listAssets() });
}

// Saves an asset from the intake form. Every field is optional except the name.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = Object.fromEntries(
    FIELDS.filter((field) => typeof body[field] === 'string').map((field) => [field, body[field] as string]),
  );

  if (!input.name?.trim()) {
    return NextResponse.json({ error: 'Give the asset a name.' }, { status: 400 });
  }

  try {
    const asset = await createAsset({ ...input, name: input.name });
    return NextResponse.json({ asset, workflow: getWorkflowForAsset(asset.assetId) }, { status: 201 });
  } catch (error) {
    if (error instanceof StoreNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    throw error;
  }
}
