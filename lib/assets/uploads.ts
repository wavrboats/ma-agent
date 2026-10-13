import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase-server';

// Vercel rejects request bodies over 4.5 MB, so files are uploaded by the browser straight to private
// Supabase Storage buckets through signed URLs:
// - "read": a PDF for Claude to read. The extract route deletes it once read.
// - "attach": a photo or PDF kept with the asset.

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export type UploadKind = 'read' | 'attach';

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const BUCKETS: Record<UploadKind, { name: string; types: string[] }> = {
  read: { name: 'intake-uploads', types: ['application/pdf'] },
  attach: { name: 'asset-files', types: Object.keys(EXTENSIONS) },
};

export const ATTACHMENT_BUCKET = BUCKETS.attach.name;

// Paths are generated here; anything else is refused so routes can only touch uploads made this way.
const PATH = /^\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.(pdf|jpg|png|webp|heic|heif)$/;
export const isUploadPath = (path: unknown): path is string => typeof path === 'string' && PATH.test(path);

export class UploadError extends Error {}

async function ensureBucket(db: SupabaseClient, kind: UploadKind) {
  const { name, types } = BUCKETS[kind];
  const { error } = await db.storage.getBucket(name);
  if (!error) return;
  const created = await db.storage.createBucket(name, { public: false, fileSizeLimit: MAX_UPLOAD_BYTES, allowedMimeTypes: types });
  // Another request may have created it in the meantime.
  if (created.error && !/exist/i.test(created.error.message)) {
    throw new Error(`Could not create the ${name} bucket: ${created.error.message}`);
  }
}

// Returns null when Supabase is not configured; callers then fall back to sending the file directly.
export async function createSignedUpload(kind: UploadKind, size: number, contentType: string) {
  const db = getServerSupabase();
  if (!db) return null;
  if (!BUCKETS[kind].types.includes(contentType)) throw new UploadError('This kind of file cannot be uploaded here.');
  if (!(size > 0) || size > MAX_UPLOAD_BYTES) throw new UploadError('Files can be up to 20 MB.');

  await ensureBucket(db, kind);
  const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${EXTENSIONS[contentType]}`;
  const { data, error } = await db.storage.from(BUCKETS[kind].name).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Could not prepare the upload: ${error?.message ?? 'no URL returned'}`);
  return { path, uploadUrl: data.signedUrl };
}

export async function takeUploadedPdf(path: string): Promise<Buffer> {
  const db = getServerSupabase();
  if (!db) throw new UploadError('Uploads need Supabase.');
  if (!isUploadPath(path) || !path.endsWith('.pdf')) throw new UploadError('Unknown upload.');

  const { data, error } = await db.storage.from(BUCKETS.read.name).download(path);
  if (error || !data) throw new UploadError('The uploaded file could not be found. Upload it again.');
  const pdf = Buffer.from(await data.arrayBuffer());
  if (pdf.length > MAX_UPLOAD_BYTES) throw new UploadError('PDFs can be up to 20 MB.');
  return pdf;
}

export async function removeUploadedPdf(path: string) {
  await getServerSupabase()?.storage.from(BUCKETS.read.name).remove([path]);
}

// Short-lived links for showing an asset's attachments.
export async function signAttachmentUrls(paths: string[]): Promise<Record<string, string>> {
  const db = getServerSupabase();
  if (!db || paths.length === 0) return {};
  const { data } = await db.storage.from(ATTACHMENT_BUCKET).createSignedUrls(paths, 60 * 60);
  const urls: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  return urls;
}
