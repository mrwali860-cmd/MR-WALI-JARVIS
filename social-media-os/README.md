# Social Media OS — Isolated Foundation

This folder is a standalone workstream on the `social-media-os-foundation` branch. It keeps application code and dependencies separate from the root JARVIS app. The branch also adds a Social Media OS test step to the repository CI workflow; review that workflow change before merging PR #27.

## Current workflow

1. Search the web through the Tavily API when `TAVILY_API_KEY` is configured.
2. Store normalized search results in local research history.
3. Build a source-linked, deterministic content strategy from the latest saved research.
4. Generate platform-labelled content drafts using templates.
5. Run basic deterministic quality checks and require explicit human review.
6. Track revenue-funnel metrics from supplied inputs; analytics are not automatically collected.

## Requirements

- Node.js 18+
- No third-party dependencies for this isolated folder
- Optional Tavily API key for live web search: `TAVILY_API_KEY`

## Run tests

From this folder:

```powershell
npm test
```

CI mocks the web-search provider. A passing CI run does not prove that a real Tavily key works or that live search has been verified.

## Try the local draft workflow

From this folder:

```powershell
node src/cli.js --brand "Sample Brand" --audience "small business owners" --topic "Practical AI workflows" --language English --platform youtube-shorts --goal leads
node src/cli.js --list
```

Drafts are appended to `data/drafts.jsonl` under this folder. This is local file storage, not a shared database or backup. Draft generation uses deterministic templates; it does not call an AI model.

## Run the local dashboard

From this folder:

```powershell
node src/server.js
```

Open `http://127.0.0.1:4177` on the same computer. The server binds to loopback only. Set `SOCIAL_MEDIA_OS_PORT` to change the port, `SOCIAL_MEDIA_OS_STORE_PATH` to select a separate local draft store, or `SOCIAL_MEDIA_OS_RESEARCH_STORE_PATH` to select a separate local research store. Do not expose this unauthenticated V1 dashboard to a public network.

## Current scope and limitations

Supported platform labels: YouTube, YouTube Shorts, Facebook, Instagram, TikTok, LinkedIn, and X. A platform label is not evidence that its API is connected.

- Tavily search can retrieve source snippets, but snippets are research leads, not verified facts. Check original pages before making factual claims.
- The research brief module organizes source notes and links claims to listed URLs; it does not independently verify claims.
- The strategy planner and content drafts are deterministic templates, not LLM-generated market research or creative content.
- The pipeline creates and saves drafts only. It does not publish posts, send messages, or connect social accounts.
- Video/audio rendering, scheduling, platform analytics ingestion, and automatic revenue attribution are not implemented.
- Revenue metrics only calculate from manually or externally supplied values; they do not collect or verify those values.

Publishing adapters must be added and tested separately, with platform authorization and explicit approval gates.
