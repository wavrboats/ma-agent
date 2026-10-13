# ma-agent

Asset → Exit AI-agent pipeline app (Next.js 14, TypeScript, Tailwind, Supabase, Anthropic SDK, deployed on Vercel).

Start by reading `docs/HANDOFF.md`, which covers the current state and the next steps for connecting the real agents. `docs/pipeline.md` describes the 12 stages, the gates and the run API.

## Commands

- `npm install`
- `npx tsc --noEmit`: typecheck
- `npm run build`: production build
- `npm run dev`: local app; without Supabase, data goes to `.data/` (git-ignored)

## Conventions

- Agents use `claude-opus-5-5` through `@anthropic-ai/sdk`, with server-side refusal fallback (`fallbacks: "default"`).
- Data rule: every finding has a source URL, date, confidence, owner and status. Unknown values are `null`, never 0. Agents only recommend at gates; people decide.
- Vercel limits: request bodies over 4.5 MB go through Supabase Storage signed uploads, and long work runs in resumable steps (`maxDuration` 300).
- Test UI changes at phone width (iPhone 13 in Playwright, with Chromium from `/opt/pw-browsers`); the user tests on a phone.
- Sample asset: `docs/samples/pearl-of-garden-city.txt`.
