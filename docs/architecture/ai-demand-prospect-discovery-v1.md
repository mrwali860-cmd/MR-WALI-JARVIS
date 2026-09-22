# AI Demand Prospect Discovery V1

## Goal
Identify companies in Dubai/UAE that show a current hiring signal for AI engineers, AI developers, or AI automation developers.

## Flow
`SEARCH QUERIES → GOOGLE SEARCH PROVIDER → NORMALIZE → DEDUPLICATE → AI DEMAND PROSPECTS`

## Output
Each record contains:
- company
- job_title
- url
- snippet
- source
- search_query
- demand_signal

## Safety boundary
This module only discovers public hiring signals. It does not apply for jobs, contact companies, send messages, or make payments.

## Runtime
`node scripts/ai-demand-prospect-discovery.js`

Required:
- `APIFY_TOKEN`

Optional:
- `AI_DEMAND_MAX_RESULTS` (default 20)
- `AI_DEMAND_OUTPUT_FILE` (default `data/ai-demand-prospects.json`)
- `AI_DEMAND_SEARCH_ACTOR` (default `searchapi~google-search-scraper`)

The selected Apify Google Search Scraper supports Google queries and structured organic-result output. 
