# Empire-OS → MR-WALI-JARVIS Migration

## Canonical repository
`mrwali860-cmd/MR-WALI-JARVIS`

## Migration branch
`merge/empire-os-into-mr-wali-jarvis`

## Source
`mrwali860-cmd/Empire-OS` (`main`)

## Policy
Only audited, dependency-complete components are migrated. Frozen MR-WALI-JARVIS components are not rewritten as part of this migration.

## Migrated
- `empire-os/brain/` — BrainPipeline and supporting brain modules.
- `empire-os/agent/__init__.py`
- `empire-os/agent/tasks.py` — task lifecycle model.
- `empire-os/agent/task_engine.py` — task lifecycle manager.
- `empire-os/agent/audit.py` — immutable execution audit contract.
- `empire-os/agent/capabilities.py` — capability registry/executor layer; retained as an isolated imported subsystem and requires Python-side verification before being promoted into the active runtime.

## Audited / not blindly migrated
Legacy or structurally inconsistent Empire-OS modules are excluded until their dependencies and contracts are proven. In particular, `src/business/business_engine.py` was found to contain unittest/test code despite its engine-like filename, so it is not treated as a production business engine.

## Security
- No `.env` or secret-bearing file is imported from Empire-OS.
- The previously tracked repository `.env` credential was removed from this migration branch.
- The affected Apify credential was rotated before final merge review.
- `.env.example` remains placeholder-only.

## Verification gate
Architecture → Contract → Tests → Implementation → CI → Exact SHA → Evidence → Freeze.

This file is a migration record, not a claim that the migration is complete or production-frozen.
