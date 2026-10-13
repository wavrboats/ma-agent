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
