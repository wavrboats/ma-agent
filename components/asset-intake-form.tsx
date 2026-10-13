'use client';

import { useMemo, useState } from 'react';

const defaultForm = {
  name: 'Amoun Leather Factory',
  assetClass: 'Industrial Facility',
  country: 'Egypt',
  city: 'El Salheya',
  address: 'Sharqia Industrial Zone',
  industry: 'Leather Processing',
  description: 'Former industrial leather factory requiring operational and legal verification before strategic exit planning.',
  ownerObjective: 'Sell or restart under a strategic acquirer',
  transactionType: 'Asset Sale',
  operatingStatus: 'Closed',
  askingPrice: '',
};

type AssetUploadRecord = Partial<typeof defaultForm>;

type UploadStatus = { tone: 'info' | 'success' | 'error'; message: string } | null;

const MAX_PDF_BYTES = 4 * 1024 * 1024;

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
  const [submitted, setSubmitted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null);
  const [reading, setReading] = useState(false);

  const summary = useMemo(() => {
    return `${form.name} • ${form.assetClass} • ${form.country}`;
  }, [form]);

  const updateField = (field: keyof typeof defaultForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const readPdf = async (file: File) => {
    if (file.size > MAX_PDF_BYTES) {
      setUploadStatus({ tone: 'error', message: 'This PDF is larger than 4 MB. Upload a smaller or compressed copy.' });
      return;
    }

    setReading(true);
    setUploadStatus({ tone: 'info', message: `Reading ${file.name} with Claude. This can take up to a minute.` });
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/assets/extract', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setUploadStatus({ tone: 'error', message: data.error ?? 'The PDF could not be read.' });
        return;
      }

      const fields = data.fields as ExtractedFields;
      if (!fields.is_asset_document) {
        setUploadStatus({ tone: 'error', message: `${file.name} does not describe a specific asset, so the form was not changed.` });
        return;
      }

      // A field the document does not state is cleared rather than left with the sample values.
      const next = { ...defaultForm };
      const missing: string[] = [];
      for (const [formField, extractedField, label] of extractedFieldMap) {
        const value = fields[extractedField];
        next[formField] = typeof value === 'string' ? value : '';
        if (typeof value !== 'string') missing.push(label);
      }
      setForm(next);
      setUploadStatus({
        tone: 'success',
        message: `Filled the form from ${file.name}.${missing.length > 0 ? ` Not stated in the document: ${missing.join(', ')}.` : ''} Check every field before you continue.`,
      });
    } catch {
      setUploadStatus({ tone: 'error', message: 'The upload failed. Check your connection and try again.' });
    } finally {
      setReading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still triggers a change.
    event.target.value = '';
    if (!file) return;

    if (isPdfFile(file)) {
      await readPdf(file);
      return;
    }

    try {
      const text = await file.text();
      const jsonRecord = parseJsonAsset(text);
      const csvRecord = jsonRecord ? null : parseCsvAsset(text);
      const record = jsonRecord || csvRecord;

      if (!record) {
        setUploadStatus({ tone: 'error', message: 'This file is not in a supported format. Use a PDF, or JSON or CSV with asset fields.' });
        return;
      }

      setForm((prev) => ({
        ...prev,
        ...record,
      }));
      setUploadStatus({ tone: 'success', message: `Loaded asset profile from ${file.name}.` });
    } catch {
      setUploadStatus({ tone: 'error', message: 'There was an error reading the uploaded file.' });
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-dashed border-brand-500/40 bg-brand-500/5 p-4">
          <p className="mb-3 text-sm font-medium text-white">Upload existing asset file</p>
          {/* A label-wrapped input gives phones a large tap target. MIME types sit next to the extensions
              because iOS and Android pickers grey out files matched only by extension. */}
          <label
            className={`flex w-full cursor-pointer items-center justify-center rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-400 ${
              reading ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {reading ? 'Reading document…' : 'Choose a file'}
            <input
              type="file"
              accept="application/pdf,.pdf,application/json,.json,text/csv,.csv,text/plain,.txt"
              onChange={handleFileUpload}
              disabled={reading}
              className="sr-only"
            />
          </label>
          <p className="mt-2 text-xs text-slate-400">
            PDF (up to 4 MB), JSON or CSV. Claude reads PDFs and fills in the form; you check the result.
          </p>
          {uploadStatus && (
            <p role="status" className={`mt-2 text-xs ${statusStyles[uploadStatus.tone]}`}>
              {uploadStatus.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Asset name</span>
            <input
              value={form.name}
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
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-400">{summary}</div>
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200">
              Save Draft
            </button>
            <button type="submit" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400">
              Start Full Asset Analysis
            </button>
          </div>
        </div>
      </form>

      {submitted && (
        <div className="mt-6 rounded-2xl border border-emerald-700/50 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          Asset intake created successfully. The CEO AI Agent has initialized the workflow for {form.name}.
        </div>
      )}
    </div>
  );
}
