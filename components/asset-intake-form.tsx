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

export function AssetIntakeForm() {
  const [form, setForm] = useState(defaultForm);
  const [submitted, setSubmitted] = useState(false);

  const summary = useMemo(() => {
    return `${form.name} • ${form.assetClass} • ${form.country}`;
  }, [form]);

  const updateField = (field: keyof typeof defaultForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="card p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="badge mb-3">Asset Intake</div>
          <h2 className="text-2xl font-semibold text-white">Create a new asset mandate</h2>
        </div>
        <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.12em] text-slate-300">
          Manual Entry
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4">
          <p className="mb-2 text-sm font-medium text-white">Document upload</p>
          <input type="file" multiple className="block w-full text-sm text-slate-300" />
          <p className="mt-2 text-xs text-slate-500">Supports: PDF, DOCX, XLSX, CSV, JPG, PNG</p>
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
