# Handover: state of the project and next steps

Last updated 2026-10-13. Read this first when picking the project up in a new session.

## What exists

The app is a Next.js 14 + TypeScript + Tailwind project deployed on Vercel, built around the 12-stage pipeline in the "Asset → Exit AI-Agent Operating Pipeline" spec (`lib/pipeline.ts`, `docs/pipeline.md`).

| Part | Where | Status |
|---|---|---|
| Pipeline model: stages, gates G0–G5, workstreams, data rule | `lib/pipeline.ts` | Done |
| Real Claude agents: Intake, Screening, DD (stages 01–03) | `lib/agents/` | Built; tested only against a stand-in API, **never run against Claude** |
| Agent console for real runs | `/agents`, `components/agent-console.tsx` | Built; needs the keys below |
| Run API: start, step, gate decisions | `app/api/agents/` | Built; runs in short steps under Vercel's time limit |
| Asset intake: fields, Document details box, photos and PDFs | `/assets/new`, `components/asset-intake-form.tsx` | Working |
| PDF and photo reading with Claude | `app/api/assets/extract`, `lib/assets/extract.ts` | Built; needs `ANTHROPIC_API_KEY` |
| Asset storage | `lib/assets/store.ts` | Supabase `assets` table; on Vercel without Supabase, assets are saved in the browser (IndexedDB) |
| Test run (rules only, no AI) through all 12 stages | `lib/test-run.ts`, `lib/test-run-checklists.ts`, `lib/test-run-layers.ts` | Working; used while no API key exists |
| Layered bubble map (Obsidian-style) | `/agents/test?draft=…`, `components/pipeline-graph.tsx`, `components/bubble-cluster.tsx`, `components/workstream-bubbles.tsx`, `components/test-run-console.tsx` | Working, for the test run only |

Sample asset for testing: `docs/samples/pearl-of-garden-city.txt`. Form fields are at the top; paste everything under "DOCUMENT DETAILS" into the Document details box.

Preview link for the working branch: https://ma-agent-git-claude-new-session-xvwpm4-hazem96-5346.vercel.app

## How the real agents work today

- `lib/agents/runner.ts` runs one stage at a time with a manual tool loop on `claude-opus-5-5`. Stage agents use the tools `record_finding`, `record_risk`, `request_document` and `recommend_gate`. Screening and DD can also search and fetch web pages.
- The data rule is enforced in `record_finding`:
  - A finding needs a source URL, date, confidence and status.
  - A finding is capped at UNVERIFIED if it cites a page the agent never opened, or rests only on intake data.
  - Unknown values are `null`.
- Each `POST /api/agents/step` runs for up to about 4½ minutes and saves the stage conversation after every model call, so a stage resumes on the next step. The `/agents` page keeps calling it while open.
- Gates: G0 passes automatically when Screening recommends APPROVE; G1 waits for a named human decision.
- State lives in the Supabase `agent_run_states` table, or `.data/` in local development.

## To connect the real agents (next session)

1. **Keys in Vercel:** for each project you use, set these for both Production and Preview, then redeploy:
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. **Database:** run `supabase/schema.sql` in the Supabase SQL editor. It only adds tables and columns.
3. **Smoke test:** save The Pearl with **Save and run agents**, keep `/agents` open, and check that Intake → Screening → DD produce findings with real sources and stop at G1.
4. **Build the remaining real agents** (04 ASSESS to 12 EXECUTE) in `lib/agents/definitions.ts`. The test run's rules in `lib/test-run.ts` show what each stage should produce. The Buyer Agent should research real buyers, their ability to pay and their decision makers, with sources.
5. **Wire the bubble map to real runs.** `PipelineGraph` and the layer views take a `TestRunState`, which extends `AgentRunState` with `buyers`, `outputs`, `checklists` and `outcome`.
   - Have the real runner fill the same fields.
   - Feed `/agents` with the same map in place of the current card layout.
6. **Uploaded documents:** let the agents read uploaded documents. Attachments are in the `asset-files` bucket, listed in `assets.attachments`.

## Known limits

- The test run reads only the typed and pasted text. It does no research, so its buyers are buyer types plus names that appear in the material.
- Assets saved on the device stay in that browser only, and the real agents cannot see them.
- The existing `assets` table policies allow anonymous select and insert. Lock them down before real data goes in.
- A run only moves forward while someone has the agents page open. Unattended runs need a background job (for example Vercel Cron or a queue).
