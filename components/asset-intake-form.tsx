'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { saveDeviceDraft } from '@/lib/device-drafts';

// The form starts empty so a real intake never inherits sample values.
const defaultForm = {
  name: '',
  assetClass: '',
  country: '',
  city: '',
  address: '',
  industry: '',
  description: '',
  ownerObjective: '',
  transactionType: '',
  operatingStatus: '',
  askingPrice: '',
  // Free text copied from the asset's documents: the agents read it with the rest of the intake record.
  documentDetails: '',
};

const MAX_DETAILS_CHARS = 50_000;

type AssetUploadRecord = Partial<typeof defaultForm>;

type UploadStatus = { tone: 'info' | 'success' | 'error'; message: string } | null;

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;
// Photos are shrunk in the browser to keep uploads quick on a phone connection.
const MAX_PHOTO_SIDE = 2000;
// Types Claude can read from a photo.
const READABLE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// What this deployment can do; see /api/assets/capabilities.
type Capabilities = { ai: boolean; assetStore: 'supabase' | 'local-file' | 'none'; attachments: boolean };

type Attachment = { id: string; name: string; type: string; blob: Blob; previewUrl: string | null };

// Matches the fields returned by /api/assets/extract. null means the document does not state it.
type ExtractedFields = {
  is_asset_document: boolean;
  name: string | null;
  asset_class: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  industry: string | null;
  description: string | null;
  owner_objective: string | null;
  transaction_type: string | null;
  operating_status: string | null;
  asking_price: string | null;
};

const extractedFieldMap: [keyof typeof defaultForm, keyof ExtractedFields, string][] = [
  ['name', 'name', 'asset name'],
  ['assetClass', 'asset_class', 'asset class'],
  ['country', 'country', 'country'],
  ['city', 'city', 'city'],
  ['address', 'address', 'address'],
  ['industry', 'industry', 'industry'],
  ['description', 'description', 'description'],
  ['ownerObjective', 'owner_objective', 'owner objective'],
  ['transactionType', 'transaction_type', 'transaction type'],
  ['operatingStatus', 'operating_status', 'operating status'],
  ['askingPrice', 'asking_price', 'asking price'],
];

const isPdfFile = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
const isPhotoFile = (file: File) => file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(file.name);

// Re-encodes a photo as a JPEG no larger than MAX_PHOTO_SIDE. Returns null when the browser cannot
// decode it (e.g. HEIC outside Safari); the original file is then kept as it is.
async function shrinkPhoto(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const fileType = (name: string, type: string) =>
  type || (/\.pdf$/i.test(name) ? 'application/pdf' : /\.heic$/i.test(name) ? 'image/heic' : /\.heif$/i.test(name) ? 'image/heif' : '');

const formatSize = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

const statusStyles = { info: 'text-slate-300', success: 'text-emerald-300', error: 'text-red-300' };

const normalizeAssetRecord = (record: Record<string, any>): AssetUploadRecord | null => {
  const name =
    record.name ||
    record.asset_name ||
    record.assetName ||
    record.asset ||
    record.title ||
    '';

  const maybe = {
    name: String(name || '').trim(),
    assetClass:
      String(
        record.asset_class ||
          record.assetClass ||
          record.assetclass ||
          record.type ||
          defaultForm.assetClass
      ).trim(),
    country: String(record.country || defaultForm.country).trim(),
    city: String(record.city || defaultForm.city).trim(),
    address: String(record.address || record.location || defaultForm.address).trim(),
    industry: String(record.industry || record.business || '').trim() || defaultForm.industry,
    description: String(
      record.description ||
        record.summary ||
        record.notes ||
        defaultForm.description
    ).trim(),
    ownerObjective: String(
      record.owner_objective ||
        record.ownerObjective ||
        record.objective ||
        defaultForm.ownerObjective
    ).trim(),
    transactionType: String(
      record.transaction_type ||
        record.transactionType ||
        record.transaction ||
        defaultForm.transactionType
    ).trim(),
    operatingStatus: String(
      record.operating_status ||
        record.operatingStatus ||
        record.status ||
        defaultForm.operatingStatus
    ).trim(),
    askingPrice: String(
      record.asking_price ??
        record.askingPrice ??
        record.price ??
        defaultForm.askingPrice
    ).trim(),
  };

  if (!maybe.name && !maybe.address && !maybe.country) {
    return null;
  }

  return maybe;
};

const parseJsonAsset = (text: string): AssetUploadRecord | null => {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return normalizeAssetRecord(parsed[0] || {});
    }
    if (parsed && typeof parsed === 'object') {
      return normalizeAssetRecord(parsed as Record<string, any>);
    }
    return null;
  } catch {
    return null;
  }
};

const parseCsvAsset = (text: string): AssetUploadRecord | null => {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length < 2) return null;

  const separator = rows[0].includes(';') ? ';' : ',';
  const headers = rows[0].split(separator).map((h) => h.trim().toLowerCase());
  const values = rows[1].split(separator).map((v) => v.trim());

  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    record[header] = values[index] || '';
  });

  return normalizeAssetRecord(record);
};

export function AssetIntakeForm() {
  const [form, setForm] = useState(defaultForm);
  const router = useRouter();
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [savedOnDevice, setSavedOnDevice] = useState<{ id: string; name: string } | null>(null);

  const summary = useMemo(() => [form.name, form.assetClass, form.country].filter(Boolean).join(' • '), [form]);

  useEffect(() => {
    fetch('/api/assets/capabilities', { cache: 'no-store' })
      .then((response) => response.json())
      .then(setCapabilities)
      // If the check fails, fall back to the mode that needs nothing from the server.
      .catch(() => setCapabilities({ ai: false, assetStore: 'none', attachments: false }));
  }, []);

  // Preview images are freed when their attachment is removed or saved, and when the page closes.
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  useEffect(() => () => attachmentsRef.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl)), []);
  const freePreviews = (items: Attachment[]) => items.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));

  const updateField = (field: keyof typeof defaultForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addAttachment = async (file: File): Promise<string | null> => {
    if (isPhotoFile(file)) {
      const shrunk = await shrinkPhoto(file);
      if (!shrunk && file.size > MAX_FILE_BYTES) return `${file.name} is larger than 20 MB.`;
      const blob = shrunk ?? file;
      const name = shrunk ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name;
      const type = shrunk ? 'image/jpeg' : fileType(file.name, file.type);
      setAttachments((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name, type, blob, previewUrl: shrunk ? URL.createObjectURL(shrunk) : null },
      ]);
      return null;
    }
    if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than 20 MB.`;
    setAttachments((prev) => [...prev, { id: crypto.randomUUID(), name: file.name, type: 'application/pdf', blob: file, previewUrl: null }]);
    return null;
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    // Reset so choosing the same file again still triggers a change.
    event.target.value = '';
    const problems: string[] = [];
    let added = 0;

    for (const file of files) {
      if (isPdfFile(file) || isPhotoFile(file)) {
        if (attachments.length + added >= MAX_ATTACHMENTS) {
          problems.push(`Only ${MAX_ATTACHMENTS} files can be attached.`);
          break;
        }
        const problem = await addAttachment(file);
        if (problem) problems.push(problem);
        else added += 1;
        continue;
      }

      // JSON and CSV files fill the form instead of being attached.
      const text = await file.text().catch(() => '');
      const record = parseJsonAsset(text) || parseCsvAsset(text);
      if (record) setForm((prev) => ({ ...prev, ...record }));
      else problems.push(`${file.name} is not a photo, PDF, JSON or CSV file.`);
    }

    if (problems.length > 0) setUploadStatus({ tone: 'error', message: problems.join(' ') });
    else if (added > 0) setUploadStatus({ tone: 'success', message: `Attached ${added} file${added > 1 ? 's' : ''}.` });
  };

  const removeAttachment = (id: string) => {
    freePreviews(attachments.filter((item) => item.id === id));
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  // PDFs go through storage when it exists, because Vercel refuses requests over 4.5 MB. Photos are
  // already shrunk, so they are posted directly.
  const sendForReading = async (item: Attachment): Promise<Response> => {
    if (item.type === 'application/pdf') {
      const prepared = await fetch('/api/assets/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'read', size: item.blob.size, contentType: 'application/pdf' }),
      });
      const upload = await prepared.json().catch(() => ({}));
      if (!prepared.ok) return new Response(JSON.stringify(upload), { status: prepared.status });
      if (upload.mode === 'storage') {
        const stored = await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' }, body: item.blob });
        if (!stored.ok) return new Response(JSON.stringify({ error: 'The upload failed. Try again.' }), { status: 502 });
        return fetch('/api/assets/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: upload.path }),
        });
      }
    }
    const body = new FormData();
    body.append('file', new File([item.blob], item.name, { type: item.type }));
    return fetch('/api/assets/extract', { method: 'POST', body });
  };

  const readWithClaude = async (item: Attachment) => {
    setReading(item.id);
    setUploadStatus({ tone: 'info', message: `Reading ${item.name} with Claude. A long document can take a few minutes.` });
    try {
      const response = await sendForReading(item);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setUploadStatus({ tone: 'error', message: data.error ?? `${item.name} could not be read.` });
        return;
      }

      const fields = data.fields as ExtractedFields;
      if (!fields.is_asset_document) {
        setUploadStatus({ tone: 'error', message: `${item.name} does not describe a specific asset, so the form was not changed.` });
        return;
      }

      // A field the file does not state is cleared rather than left with older values. The pasted
      // document details are the user's own text, so they are kept.
      const next = { ...defaultForm, documentDetails: form.documentDetails };
      const missing: string[] = [];
      for (const [formField, extractedField, label] of extractedFieldMap) {
        const value = fields[extractedField];
        next[formField] = typeof value === 'string' ? value : '';
        if (typeof value !== 'string') missing.push(label);
      }
      setForm(next);
      setUploadStatus({
        tone: 'success',
        message: `Filled the form from ${item.name}.${missing.length > 0 ? ` Not stated: ${missing.join(', ')}.` : ''} Check every field before you save.`,
      });
    } catch {
      setUploadStatus({ tone: 'error', message: 'The upload failed. Check your connection and try again.' });
    } finally {
      setReading(null);
    }
  };

  const uploadAttachments = async () => {
    const saved = [];
    for (const item of attachments) {
      const prepared = await fetch('/api/assets/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'attach', size: item.blob.size, contentType: item.type }),
      });
      const upload = await prepared.json().catch(() => ({}));
      if (!prepared.ok || upload.mode !== 'storage') throw new Error(upload.error ?? `${item.name} could not be uploaded.`);
      const stored = await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': item.type, 'x-upsert': 'false' }, body: item.blob });
      if (!stored.ok) throw new Error(`${item.name} could not be uploaded.`);
      saved.push({ path: upload.path, name: item.name, contentType: item.type, size: item.blob.size });
    }
    return saved;
  };

  // Saves the asset on the server and opens the agents on it, or, with no database, on this device.
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!capabilities) return;
    if (!form.name.trim()) {
      setSubmitError('Give the asset a name.');
      return;
    }

    setSaving(true);
    setSubmitError('');
    try {
      if (capabilities.assetStore === 'none') {
        const draft = await saveDeviceDraft(form, attachments.map(({ name, type, blob }) => ({ name, type, blob })));
        setSavedOnDevice({ id: draft.id, name: form.name });
        setForm(defaultForm);
        freePreviews(attachments);
        setAttachments([]);
        setUploadStatus(null);
        return;
      }

      const savedAttachments = capabilities.attachments ? await uploadAttachments() : [];
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, attachments: savedAttachments }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitError(data.error ?? 'The asset could not be saved.');
        return;
      }
      router.push(`/agents?assetId=${encodeURIComponent(data.asset.assetId)}`);
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : 'The asset could not be saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDevice = capabilities?.assetStore === 'none';

  return (
    <div className="card p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="badge mb-3">Asset Intake</div>
          <h2 className="text-2xl font-semibold text-white">Create a new asset mandate</h2>
        </div>
        <div className="self-start rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.12em] text-slate-300 sm:self-auto">
          Manual Entry + Upload
        </div>
      </div>

      {savedOnDevice && (
        <div role="status" className="mb-6 rounded-2xl border border-emerald-700/50 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <p>Saved {savedOnDevice.name} on this device.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href={`/agents/test?draft=${encodeURIComponent(savedOnDevice.id)}`}
              className="rounded-xl bg-brand-500 px-4 py-2 font-semibold text-white"
            >
              Test run agents
            </Link>
            <Link href="/assets" className="rounded-xl border border-emerald-700/50 px-4 py-2">
              See it in the portfolio
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-dashed border-brand-500/40 bg-brand-500/5 p-4">
          <p className="mb-3 text-sm font-medium text-white">Photos and documents</p>
          {/* A label-wrapped input gives phones a large tap target. MIME types sit next to the extensions
              because iOS and Android pickers grey out files matched only by extension. */}
          <label className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-400">
            Add photos or files
            <input
              type="file"
              multiple
              accept="image/*,.heic,.heif,application/pdf,.pdf,application/json,.json,text/csv,.csv,text/plain,.txt"
              onChange={handleFiles}
              className="sr-only"
            />
          </label>
          <p className="mt-2 text-xs text-slate-400">
            Photos and PDFs (up to 20 MB each, {MAX_ATTACHMENTS} files) are kept with the asset. JSON or CSV fills in the form.
          </p>

          {capabilities && !capabilities.ai && (
            <p className="mt-2 text-xs text-slate-400">
              Automatic reading is off until the Anthropic key is set up, so fill in the fields yourself.
            </p>
          )}
          {onDevice && (
            <p className="mt-2 text-xs text-amber-300">
              No database is connected yet, so assets are saved on this device only. You can try them with a rule-based test run; the real agents need the database and the Anthropic key.
            </p>
          )}
          {capabilities?.assetStore === 'local-file' && attachments.length > 0 && (
            <p className="mt-2 text-xs text-amber-300">Attachments are only kept when Supabase is set up.</p>
          )}

          {attachments.length > 0 && (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {attachments.map((item) => (
                <li key={item.id} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt={item.name} className="h-28 w-full object-cover" />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-xs font-semibold uppercase text-slate-400">
                      {item.type === 'application/pdf' ? 'PDF' : 'Photo'}
                    </div>
                  )}
                  <div className="space-y-2 p-2">
                    <p className="truncate text-xs text-slate-200">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{formatSize(item.blob.size)}</p>
                    <div className="flex flex-wrap gap-2">
                      {capabilities?.ai && (item.type === 'application/pdf' || READABLE_PHOTO_TYPES.includes(item.type)) && (
                        <button
                          type="button"
                          disabled={reading !== null}
                          onClick={() => readWithClaude(item)}
                          className="rounded-lg bg-brand-500 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                        >
                          {reading === item.id ? 'Reading…' : 'Read with Claude'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(item.id)}
                        className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {uploadStatus && (
            <p role="status" className={`mt-3 text-xs ${statusStyles[uploadStatus.tone]}`}>
              {uploadStatus.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Asset name</span>
            <input
              value={form.name}
              required
              placeholder="e.g. Amoun Leather Factory"
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-0 transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Asset class</span>
            <input
              value={form.assetClass}
              onChange={(e) => updateField('assetClass', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Country</span>
            <input
              value={form.country}
              onChange={(e) => updateField('country', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">City</span>
            <input
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-slate-300">Address / location</span>
            <input
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Industry</span>
            <input
              value={form.industry}
              onChange={(e) => updateField('industry', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Operating status</span>
            <input
              value={form.operatingStatus}
              onChange={(e) => updateField('operatingStatus', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Transaction type</span>
            <input
              value={form.transactionType}
              onChange={(e) => updateField('transactionType', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Asking price</span>
            <input
              value={form.askingPrice}
              onChange={(e) => updateField('askingPrice', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-slate-300">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-slate-300">Owner objective</span>
            <textarea
              value={form.ownerObjective}
              onChange={(e) => updateField('ownerObjective', e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-slate-300">Document details</span>
            <span className="block text-xs text-slate-500">
              Paste or type what the asset&apos;s documents say: brochures, title papers, floor areas, utilities. The agents read this
              together with the fields above.
            </span>
            <textarea
              value={form.documentDetails}
              onChange={(e) => updateField('documentDetails', e.target.value)}
              rows={10}
              maxLength={MAX_DETAILS_CHARS}
              placeholder="e.g. Total building area 906 m². Ground floor, mezzanine, 6 typical floors and a roof floor…"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-400"
            />
            <span className="block text-right text-[11px] text-slate-500">
              {form.documentDetails.length.toLocaleString()} / {MAX_DETAILS_CHARS.toLocaleString()} characters
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-400">{summary}</div>
          <button
            type="submit"
            disabled={!capabilities || saving || reading !== null}
            className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50 md:w-auto md:py-2"
          >
            {!capabilities ? 'Checking…' : saving ? 'Saving…' : onDevice ? 'Save on this device' : 'Save and run agents'}
          </button>
        </div>
      </form>

      {submitError && (
        <div role="alert" className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {submitError}
        </div>
      )}
    </div>
  );
}
