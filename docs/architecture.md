# Asset-to-Exit AI Operating System

## Architecture summary

This system is designed around a human-led investment model with a central executive AI coordinating specialist departments.

### Core layers

1. Presentation layer
   - Chairman dashboard
   - asset workspace
   - workflow and approvals UI
   - report and document viewer

2. Application and orchestration layer
   - asset intake service
   - task queue
   - dependency engine
   - approval engine
   - worker orchestration

3. Domain intelligence layer
   - legal and due diligence
   - market intelligence
   - industrial and technical assessment
   - financial analysis
   - valuation
   - exit strategy
   - buyer intelligence
   - deal execution
   - risk and compliance
   - QA and red team

4. Data layer
   - structured database for assets, tasks, fields, sources, findings, buyer records
   - file storage for uploaded documents
   - source provenance and evidence records

### Human control model

- Chairman / owner keeps final decision authority.
- CEO Agent acts as orchestrator and consolidator.
- Department agents operate within stated mandate and evidence requirements.
- External actions require approval checkpoints.

### Files and folders

- `app/` – Next.js app shell and pages
- `components/` – reusable UI components
- `lib/` – utilities and shared helpers
- `supabase/` – schema and DB bootstrap files
- `docs/` – technical architecture and design notes

### Planned milestones

- Milestone 1: foundation, auth, database, dashboard, asset intake
- Milestone 2: CEO and department orchestration
- Milestone 3: financial, valuation, market intelligence
- Milestone 4: deal execution and investor outreach
- Milestone 5: QA, security, and production hardening

### Key design principles

- Evidence before conclusion
- Transparent assumptions
- Source-based outputs
- Human approval for external actions
- Explicit risk and confidence rating
- Departmental independence with CEO consolidation
