# ASSET-TO-EXIT AI OPERATING SYSTEM

A production-oriented M&A and asset-optimization platform for deal research, underwriting, buyer intelligence, valuation, and exit strategy.

## Overview

This repository begins the first milestone of a full-stack investment platform designed to support:

- Asset intake and document ingestion
- CEO-controlled multi-agent orchestration
- Departmental agent architecture
- Due diligence workflows
- Technical and industrial assessment
- Market and trade intelligence
- Financial modeling and valuation
- Buyer intelligence and deal execution
- Human approval checkpoints
- Chairman decision support

## Operating pipeline

Every asset moves through 12 agent-run stages: Intake → Screen → Verify → Assess → Market → Model → Value → Strategy → Buyers → Materials → Outreach → Execute. Gates G0–G5 control progress between stages, and humans approve the legal, valuation, outreach and closing gates. See [`docs/pipeline.md`](docs/pipeline.md). The master map is at `/pipeline`.

## Architecture goals

- Institutional-grade decision support
- Evidence-first findings with citation provenance
- Multi-agent task orchestration with clear dependencies
- Human-in-the-loop approvals for external action
- Arabic and English interface support
- Database-backed workflow persistence
- Secure document storage and access controls

## Milestones

### Milestone 1: Foundation
- Project setup
- Authentication and user model
- Database schema
- Asset intake and document upload flow
- Chairman dashboard foundation
- Initial multi-agent orchestration shell

### Milestone 2: CEO and departments
- Asset workflow orchestration
- Department definitions
- Agent task management
- Agent output contracts

### Milestone 3: Analysis engines
- Due diligence and technical assessment
- Market intelligence
- Financial analysis and valuation
- Buyer intelligence

### Milestone 4: Deal execution and reporting
- Deal pipeline
- Buyer outreach controls
- Document generation
- CEO reports
- Approval enforcement

### Milestone 5: QA, security, and hardening
- Tests, validations, RLS, performance tuning, deployment docs

## Stack

- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: Supabase PostgreSQL + Auth + Storage
- Orchestration: LangGraph-style workflow engine
- LLMs: OpenAI / Anthropic adapters via environment variables
- Data: structured schemas + document storage + citations

## Quick start

1. Copy `.env.example` to `.env.local`
2. Install dependencies:
   npm install
3. Start the app:
   npm run dev

## Environment variables

See `.env.example` for required values.

## Current status

This repository is the initial foundation for the system. The current build focuses on the skeleton of:
- UI shell
- data definitions
- project architecture
- orchestration starting point
- dashboard and asset intake interface

This is not a final production implementation; it is a working foundation for the full system described in the master build brief.

## Next steps

- Set up Supabase schema and migrations
- Add authentication and user sessions
- Implement asset intake API routes
- Add task orchestration and department models
- Add document upload and source provenance tracking
- Build buyer intelligence and valuation modules
- Add CEO workflows and approval logic
