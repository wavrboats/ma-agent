import Link from 'next/link';

const sampleAssets = [
  {
    id: 'AS-001',
    name: 'Amoun Leather Factory',
    assetClass: 'Industrial Facility',
    country: 'Egypt',
    status: 'INTAKE',
    createdAt: '2026-10-11',
  },
  {
    id: 'AS-002',
    name: 'Nile Logistics Park',
    assetClass: 'Logistics Real Estate',
    country: 'Egypt',
    status: 'DUE_DILIGENCE',
    createdAt: '2026-10-07',
  },
  {
    id: 'AS-003',
    name: 'Delta Chemical Processing Plant',
    assetClass: 'Manufacturing Asset',
    country: 'Egypt',
    status: 'VALUATION',
    createdAt: '2026-10-04',
  },
];

export default function AssetsPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="badge mb-3">Asset Portfolio</div>
            <h1 className="text-3xl font-semibold text-white">Assets</h1>
          </div>
          <Link href="/assets/new" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400">
            New Asset Intake
          </Link>
        </header>

        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-slate-800 text-left">
            <thead className="bg-slate-900/80">
              <tr className="text-xs uppercase tracking-[0.14em] text-slate-400">
                <th className="px-5 py-4">Asset</th>
                <th className="px-5 py-4">Class</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sampleAssets.map((asset) => (
                <tr key={asset.id} className="bg-slate-950/40">
                  <td className="px-5 py-4">
                    <div>
                      <Link href={`/assets/${asset.id}`} className="font-medium text-white hover:text-brand-300">
                        {asset.name}
                      </Link>
                      <div className="mt-1 text-xs text-slate-400">{asset.id}</div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-300">{asset.assetClass}</td>
                  <td className="px-5 py-4 text-slate-300">{asset.country}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-200">
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400">{asset.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
