# Social Media OS — Isolated Foundation

This folder is a standalone workstream on the `social-media-os-foundation` branch. It does not modify existing JARVIS source files, root scripts, dependencies, or workflows.

## First vertical

1. Configure a brand and audience.
2. Create a platform-specific content draft.
3. Run deterministic quality checks.
4. Record explicit human approval.
5. Track attributed leads, sales, costs, and revenue.

## Safety boundary

V1 creates and evaluates drafts only. It does **not** publish posts, send messages, access social accounts, or claim that external integrations are connected. Publishing adapters must be added and verified separately, with platform authorization and approval gates.

## Requirements

- Node.js 18+
- No third-party dependencies

## Run tests

From this folder:

```powershell
npm test
```

## Try the local draft workflow

From this folder, with Node.js 18+ installed:

```powershell
npm test
node src/cli.js --brand "Sample Brand" --audience "small business owners" --topic "Practical AI workflows" --language English --platform youtube-shorts --goal leads
node src/cli.js --list
```

Drafts are appended to `data/drafts.jsonl` under this folder. This is local file storage, not a shared database or backup. The CLI generates structured template-based drafts; it does not call an AI model.

## Current scope

Supported platform labels: YouTube, YouTube Shorts, Facebook, Instagram, TikTok, LinkedIn, and X. A platform label is not evidence that its API is connected. API publishing, media rendering, trend research, and analytics ingestion are not implemented in this foundation yet.
