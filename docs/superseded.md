# Superseded Documents

Records of design docs that are no longer accurate. Removed from INDEX.md but kept here for audit trail.

| Doc | Original Path | Superseded On | Reason |
| --- | ------------- | ------------- | ------ |
| Training Plans & Performance | `2026-04-21/plans/training-plans-design.md` | 2026-05-04 | Training module was refactored twice (Plan A → Plan B). References a deleted redesign doc; session API auth logic diverged from spec. |
| Frontend Redesign (Phase 2) | `2026-04-23/plans/frontend-redesign-design.md` | 2026-05-04 | Route prefix section claims routes drop the `/dashboard/` prefix, but implementation retains it. Core design token / animation sections remain valid but the routing claim creates confusion. |
| Owner Admin Dashboard | `2026-04-24/plans/owner-dashboard-design.md` | 2026-05-04 | Same route prefix inaccuracy as frontend-redesign doc. Routes are `/dashboard/owner/*` in code, not `/owner/*` as claimed. |
