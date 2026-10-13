import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase-server';

// Vercel rejects request bodies over 4.5 MB, so large PDFs are uploaded by the browser straight to a
// private Supabase Storage bucket through a signed URL. The extract route then reads the file from
// there and deletes it once Claude has read it.

export const UPLOAD_BUCKET = 'intake-uploads';
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

// Paths are generated here; anything else is refused so the route can only read intake uploads.
const UPLOAD_PATH = /^\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.pdf$/;

export class UploadError extends Error {}

async function ensureBucket(db: SupabaseClient) {
  const { error } = await db.storage.getBucket(UPLOAD_BUCKET);
  if (!error) return;
  const created = await db.storage.createBucket(UPLOAD_BUCKET, {
    public: false,
    fileSizeLimit: MAX_UPLOAD_BYTES,
    allowedMimeTypes: ['application/pdf'],
  });
  // Another request may have created it in the meantime.
  if (created.error && !/exist/i.test(created.error.message)) {
    throw new Error(`Could not create the upload bucket: ${created.error.message}`);
  }
}

export async function createPdfUpload(size: number) {
  const db = getServerSupabase();
  if (!db) return null;
  if (!(size > 0) || size > MAX_UPLOAD_BYTES) throw new UploadError('PDFs can be up to 20 MB.');

  await ensureBucket(db);
  const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.pdf`;
  const { data, error } = await db.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Could not prepare the upload: ${error?.message ?? 'no URL returned'}`);
  return { path, uploadUrl: data.signedUrl };
}

export async function takeUploadedPdf(path: string): Promise<Buffer> {
  const db = getServerSupabase();
  if (!db) throw new UploadError('Uploads need Supabase.');
  if (!UPLOAD_PATH.test(path)) throw new UploadError('Unknown upload.');

  const { data, error } = await db.storage.from(UPLOAD_BUCKET).download(path);
  if (error || !data) throw new UploadError('The uploaded file could not be found. Upload it again.');
  const pdf = Buffer.from(await data.arrayBuffer());
  if (pdf.length > MAX_UPLOAD_BYTES) throw new UploadError('PDFs can be up to 20 MB.');
  return pdf;
}

export async function removeUploadedPdf(path: string) {
  await getServerSupabase()?.storage.from(UPLOAD_BUCKET).remove([path]);
}
