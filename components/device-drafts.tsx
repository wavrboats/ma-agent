'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { deleteDeviceDraft, listDeviceDrafts } from '@/lib/device-drafts';
import type { DeviceDraft } from '@/lib/device-drafts';

type DraftView = DeviceDraft & { previews: { name: string; url: string | null; type: string }[] };

// Assets saved on this device because no database was connected. Shown only when there are some.
export function DeviceDrafts() {
  const [drafts, setDrafts] = useState<DraftView[]>([]);

  useEffect(() => {
    let views: DraftView[] = [];
    listDeviceDrafts()
      .then((saved) => {
        views = saved.map((draft) => ({
          ...draft,
          previews: draft.files.map((file) => ({
            name: file.name,
            type: file.type,
            url: file.type.startsWith('image/') ? URL.createObjectURL(file.blob) : null,
          })),
        }));
        setDrafts(views);
      })
      .catch(() => setDrafts([]));
    return () => views.forEach((draft) => draft.previews.forEach((preview) => preview.url && URL.revokeObjectURL(preview.url)));
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm('Delete this asset from this device?')) return;
    await deleteDeviceDraft(id);
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  if (drafts.length === 0) return null;

  return (
    <section className="card mb-8 p-5">
      <h2 className="text-lg font-semibold text-white">Saved on this device ({drafts.length})</h2>
      <p className="mt-1 text-sm text-slate-400">
        These were saved in this browser because no database is connected. They stay on this device. The real agents cannot run on them, but a rule-based test run can.
      </p>
      <div className="mt-4 space-y-4">
        {drafts.map((draft) => (
          <div key={draft.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{draft.fields.name || 'Untitled asset'}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {[draft.fields.assetClass, draft.fields.city, draft.fields.country].filter(Boolean).join(' · ') || 'No details yet'}
                  {' · saved '}
                  {new Date(draft.savedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/agents/test?draft=${encodeURIComponent(draft.id)}`}
                  className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white"
                >
                  Test run agents
                </Link>
                <button onClick={() => remove(draft.id)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300">
                  Delete
                </button>
              </div>
            </div>
            {draft.fields.description && <p className="mt-3 text-sm text-slate-300">{draft.fields.description}</p>}
            {draft.fields.documentDetails && (
              <details className="mt-3 text-sm text-slate-300">
                <summary className="cursor-pointer text-xs text-slate-400">
                  Document details ({draft.fields.documentDetails.length.toLocaleString()} characters)
                </summary>
                <p className="mt-2 whitespace-pre-wrap">{draft.fields.documentDetails}</p>
              </details>
            )}
            {draft.previews.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {draft.previews.map((preview, index) => (
                  <li key={`${draft.id}-${index}`} className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                    {preview.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview.url} alt={preview.name} className="h-20 w-full object-cover" />
                    ) : (
                      <div className="flex h-20 items-center justify-center p-1 text-center text-[10px] text-slate-400">{preview.name}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
