import { TestRunConsole } from '@/components/test-run-console';

export default function TestRunPage({ searchParams }: { searchParams: { draft?: string } }) {
  return <TestRunConsole draftId={searchParams.draft ?? ''} />;
}
