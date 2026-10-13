# Asset → Exit AI-agent operating pipeline

The pipeline is the operating model for every asset class: factories, commercial property, hospitality, land and corporate assets. The code version is in `lib/pipeline.ts`. The app renders it at `/pipeline`, and the Supabase schema seeds it into `pipeline_stages` and `stage_gates`.

## Stages

| # | Stage | Scope | Agent | Exit gate |
|---|-------|-------|-------|-----------|
| 01 | INTAKE | Asset registration | Intake Agent | |
| 02 | SCREEN | Mandate / red flags | Screening Agent | G0 |
| 03 | VERIFY | Legal + ownership | DD Agent | G1 |
| 04 | ASSESS | Technical + ESG | Engineering Agent | |
| 05 | MARKET | Demand + competitors | Research Agent | |
| 06 | MODEL | Financial normalization | Finance Agent | G2 |
| 07 | VALUE | Valuation + scenarios | Valuation Agent | G3 |
| 08 | STRATEGY | Exit / reposition / JV | Strategy Agent | |
| 09 | BUYERS | Longlist → shortlist | Buyer Agent | G4 |
| 10 | MATERIALS | Teaser + CIM + data room | Deal Prep Agent | |
| 11 | OUTREACH | NDA + buyer engagement | Origination Agent | |
| 12 | EXECUTE | Offers → SPA → close | Execution Agent | G5 |

## Gates

- G0 Mandate accepted
- G1 Identity & ownership verified (human approval: Legal)
- G2 Asset commercially viable
- G3 Valuation approved (human approval: Chairman)
- G4 Buyer list approved (human approval: Chairman; this gate controls outreach)
- G5 Binding terms approved (human approval: Chairman)

An asset can move past a stage only after that stage's exit gate is approved (`canAdvance` / `nextStage`).

## Data rule

Each finding has a source URL, date, confidence, owner and status. Unknown ≠ zero: a missing value is stored as `null`, never `0`. `validateFinding` enforces this rule.

## Workstreams

- 03–04 Due diligence: 15 workstreams. Output: verified fact book, risk register, missing-documents list.
- 05 Market research: 30 workstreams. Output: market sizing, competition, trade flows, opportunity map.
- 06–08 Economics, value & exit: 15 workstreams. Output: investment case and approved transaction strategy.
- 09–12 Buyer → closing: 15 workstreams. Output: ranked targets, controlled outreach, transaction completion.

## Architecture

There is one asset ID across all stages. Agents do the research; humans approve irreversible decisions.

- Orchestrator: asset ID, workflow, stage gates
- Source Collector: registries, regulators, trade data, news
- Verification: entity matching, cross-source checks
- Analysis: market, financial, technical, valuation
- Buyer Intelligence: buyer evidence, import economics, scoring
- Deal Execution: CRM, documents, approvals, milestones

Shared database: Assets, Entities, Sources, Findings, Risks, Financials, Markets, Buyers, Contacts, Documents, Tasks, Approvals, Audit log.

Example sources: GAFI, IDA, CAPMAS, GOEIC, Chambers, UN Comtrade, ITC/WITS, company filings, land registry, site inspection. Access and reliability vary by source.

## Roadmap

Deploy in increments. Don't automate conclusions until the evidence behind them is reliable.

1. Intake + asset database + source registry
2. DD checklists + verification + risk flags
3. Market data + HS-level trade analytics
4. Valuation model + strategic buyer ranking
5. Teaser/CIM generation + deal CRM
6. Pilot on Amoun + human review + refine

## Running the agents

The first three agents run on Claude through the Anthropic SDK: Intake (01), Screening (02) and DD (03). Agent code is in `lib/agents/`, and the console is at `/agents`.

### Locally

1. Set `ANTHROPIC_API_KEY` in `.env.local`.
2. Run `npm run dev`, open `/agents`, pick an asset and press **Run agents**.

Without Supabase settings, local runs are saved to `.data/agent-runs/<assetId>.json`.

### On Vercel

Vercel has no shared disk that functions can write to, and it stops each function after a time limit. So:

1. Apply `supabase/schema.sql` to your Supabase project. Runs are stored in its `agent_run_states` table, which only the service-role key can read or write.
2. In each Vercel project, set these environment variables, then redeploy:
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

Without Supabase on Vercel, the agent API returns a 503 that names the missing settings.

### How a run moves forward

- A run advances in steps. Each step is one request to `POST /api/agents/step`, which runs the agents for at most 4 minutes 40 seconds: it starts no new model call after 3 minutes 20 seconds. The function's `maxDuration` is 300 seconds, the most every Vercel plan allows.
- After every model call the stage's conversation is saved. A stage that isn't finished when the step's time is up continues from that point on the next step.
- The `/agents` page asks for the next step as soon as the previous one returns. **A run only moves forward while someone has the page open**, or while another client keeps calling the step endpoint.
- A lease stops two requests from working on the same run at once. If a step dies mid-way, the lease expires after five minutes and the next step picks up from the last save.

### What the agents do

- Each agent works through its stage's workstreams. It records its work with four tools: `record_finding`, `record_risk`, `request_document` and `recommend_gate`. Screening and DD can also search and fetch web pages.
- The runner enforces the data rule on every finding:
  - A finding without a valid source URL, date, confidence or status is rejected, and the agent is told to fix it.
  - A finding is capped at UNVERIFIED if it cites a page the agent never opened in that stage, or if it rests only on the owner's intake data.
  - Unknown values are stored as `null`.
- Agents only recommend on gates. G0 is not a human gate, so the orchestrator approves it when the Screening Agent recommends APPROVE; otherwise the CEO decides it. The run stops at G1 until Legal approves or rejects it in the console. The decision must name the person who made it, and the audit log records it.
- After G1 approval the run moves to stage 04 and stops, because the Engineering Agent is not built yet.

Each stage calls `claude-opus-5-5` at `high` effort. Server-side refusal fallback (`fallbacks: "default"`) is on: if the model declines a turn for safety reasons, the API retries it on a fallback model.

### API

- `GET /api/agents?assetId=AS-001`: current run state. `stepInProgress` is true while a step is running.
- `POST /api/agents` `{ assetId, reset? }`: start a run, or retry a failed stage.
- `POST /api/agents/step` `{ assetId }`: run one step. Call it again while `status` is `RUNNING`.
- `POST /api/agents/gates` `{ assetId, gate, decision: "APPROVED" | "REJECTED", decidedBy, notes? }`: record a human gate decision. After an approval, keep calling the step endpoint.
