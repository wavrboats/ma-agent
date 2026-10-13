import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { assertWritableStore, getServerSupabase } from '@/lib/supabase-server';
import { isUploadPath } from '@/lib/assets/uploads';
import { mockAssets } from '@/lib/types';
import type { Asset, AssetAttachment } from '@/lib/types';

// Assets created through intake are saved in the Supabase `assets` table when it is configured, and in
// .data/assets.json in local development. The built-in sample assets are always listed after them.

const DATA_FILE = path.join(process.cwd(), '.data', 'assets.json');

export type AssetInput = {
  name: string;
  assetClass?: string;
  country?: string;
  city?: string;
  address?: string;
  industry?: string;
  description?: string;
  ownerObjective?: string;
  transactionType?: string;
  operatingStatus?: string;
  askingPrice?: string;
  attachments?: unknown;
};

const MAX_ATTACHMENTS = 20;

// Keeps only attachments that point at uploads made through /api/assets/uploads.
function cleanAttachments(value: unknown): AssetAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && isUploadPath(item.path))
    .slice(0, MAX_ATTACHMENTS)
    .map((item) => ({
      path: item.path,
      name: String(item.name ?? 'file').slice(0, 200),
      contentType: String(item.contentType ?? ''),
      size: Number(item.size) || 0,
    }));
}

type AssetRow = {
  asset_id: string;
  name: string;
  asset_class: string;
  country: string | null;
  city: string | null;
  address: string | null;
  industry: string | null;
  description: string | null;
  owner_objective: string | null;
  transaction_type: string | null;
  operating_status: string | null;
  asking_price: number | null;
  asking_price_text: string | null;
  attachments: AssetAttachment[] | null;
  current_stage: string;
  created_at: string;
};

const fromRow = (row: AssetRow): Asset => ({
  id: row.asset_id,
  assetId: row.asset_id,
  name: row.name,
  assetClass: row.asset_class,
  country: row.country ?? '',
  city: row.city ?? '',
  address: row.address ?? '',
  industry: row.industry ?? '',
  description: row.description ?? '',
  ownerObjective: row.owner_objective ?? '',
  transactionType: row.transaction_type ?? '',
  operatingStatus: row.operating_status ?? '',
  askingPrice: row.asking_price,
  askingPriceText: row.asking_price_text,
  attachments: row.attachments ?? [],
  status: row.current_stage,
  createdAt: row.created_at.slice(0, 10),
});

const toRow = (asset: Asset) => ({
  asset_id: asset.assetId,
  name: asset.name,
  asset_class: asset.assetClass,
  country: asset.country || null,
  city: asset.city || null,
  address: asset.address || null,
  industry: asset.industry || null,
  description: asset.description || null,
  owner_objective: asset.ownerObjective || null,
  transaction_type: asset.transactionType || null,
  operating_status: asset.operatingStatus || null,
  asking_price: asset.askingPrice,
  asking_price_text: asset.askingPriceText ?? null,
  attachments: asset.attachments ?? [],
  current_stage: asset.status,
});

async function readLocalAssets(): Promise<Asset[]> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8')) as Asset[];
  } catch {
    return [];
  }
}

async function listSavedAssets(): Promise<Asset[]> {
  const db = getServerSupabase();
  if (db) {
    const { data, error } = await db.from('assets').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(`Could not load assets: ${error.message}`);
    return (data as AssetRow[]).map(fromRow);
  }
  // Without Supabase on Vercel nothing can have been saved; show the samples only.
  if (process.env.VERCEL) return [];
  return readLocalAssets();
}

export async function listAssets(): Promise<Asset[]> {
  return [...(await listSavedAssets()), ...mockAssets];
}

export async function getAsset(assetId: string): Promise<Asset | undefined> {
  const sample = mockAssets.find((asset) => asset.assetId === assetId);
  if (sample) return sample;

  const db = getServerSupabase();
  if (db) {
    const { data, error } = await db.from('assets').select('*').eq('asset_id', assetId).maybeSingle();
    if (error) throw new Error(`Could not load the asset: ${error.message}`);
    return data ? fromRow(data as AssetRow) : undefined;
  }
  return (await readLocalAssets()).find((asset) => asset.assetId === assetId);
}

// A plain number becomes the numeric price; anything else ("EGP 30 million") is kept as text only.
// A blank price stays null: unknown ≠ zero.
function parsePrice(value: string | undefined) {
  const text = value?.trim() ?? '';
  if (!text) return { askingPrice: null, askingPriceText: null };
  const numeric = Number(text.replace(/,/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? { askingPrice: numeric, askingPriceText: null } : { askingPrice: null, askingPriceText: text };
}

const newAssetId = () => `AS-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 36 ** 2).toString(36).toUpperCase().padStart(2, '0')}`;

export async function createAsset(input: AssetInput): Promise<Asset> {
  assertWritableStore('Saving assets');
  const assetId = newAssetId();
  const clean = (value: string | undefined) => value?.trim() ?? '';

  const asset: Asset = {
    id: assetId,
    assetId,
    name: input.name.trim(),
    assetClass: clean(input.assetClass) || 'Unclassified',
    country: clean(input.country),
    city: clean(input.city),
    address: clean(input.address),
    industry: clean(input.industry),
    description: clean(input.description),
    ownerObjective: clean(input.ownerObjective),
    transactionType: clean(input.transactionType),
    operatingStatus: clean(input.operatingStatus),
    ...parsePrice(input.askingPrice),
    // Attachments live in Supabase Storage, so they are only kept when Supabase is configured.
    attachments: getServerSupabase() ? cleanAttachments(input.attachments) : [],
    status: 'INTAKE',
    createdAt: new Date().toISOString().slice(0, 10),
  };

  const db = getServerSupabase();
  if (db) {
    const { error } = await db.from('assets').insert(toRow(asset));
    if (error) throw new Error(`Could not save the asset: ${error.message}`);
    return asset;
  }

  const assets = await readLocalAssets();
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify([asset, ...assets], null, 2));
  return asset;
}
