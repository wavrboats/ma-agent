import Link from 'next/link';
import { CEOWorkflowPanel } from '@/components/ceo-workflow-panel';
import { AssetIntakeForm } from '@/components/asset-intake-form';

export default function NewAssetPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="badge mb-2">Asset Workflow</div>
            <h1 className="text-3xl font-semibold text-white">New asset intake & CEO orchestration</h1>
          </div>
          <Link href="/assets" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200">
            Back to portfolio
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <AssetIntakeForm />
          <CEOWorkflowPanel />
        </div>
      </div>
    </div>
  );
}
