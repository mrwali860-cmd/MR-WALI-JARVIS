# Live Sales Contact Enrichment V1

Purpose: bridge live public prospect discovery to approval-gated outreach by extracting a publicly listed business email from the prospect's website.

Flow:
`Apify Google Maps -> normalized prospect -> public website email enrichment -> outreach draft -> explicit approval -> authorized sender`

Safety:
- Public business contact information only.
- No login, credential harvesting, bypass, or private-data access.
- Missing/failed enrichment remains a non-sendable prospect.
- External outreach remains approval-gated.
