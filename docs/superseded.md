# Superseded Documents

Records of design docs that are no longer accurate. Removed from INDEX.md but kept here for audit trail.

| Doc | Original Path | Superseded On | Reason |
| --- | ------------- | ------------- | ------ |
| Nutrition Plans v1 | `2026-04-22/plans/nutrition-design.md` | 2026-05-05 | Full redesign: member food diary, OpenFoodFacts API, day type scheduling, extended macros, owner/trainer own-plan pages removed. |
| Nutrition Plans v2 | `2026-05-05/plans/nutrition-redesign-design.md` | 2026-05-06 | UX failed in implementation (Sheet-based Add Food too cramped, missing Recent/My Food tabs, plain text diary). Superseded by Nutrition v3 (FatSecret + full-page Add Food + ring chart visual diary + private-scope custom Foods). |
| Training Plans & Performance | `2026-04-21/plans/training-plans-design.md` | 2026-05-04 | Training module was refactored twice (Plan A → Plan B). References a deleted redesign doc; session API auth logic diverged from spec. |
| Frontend Redesign (Phase 2) | `2026-04-23/plans/frontend-redesign-design.md` | 2026-05-04 | Route prefix section claims routes drop the `/dashboard/` prefix, but implementation retains it. Core design token / animation sections remain valid but the routing claim creates confusion. |
| Owner Admin Dashboard | `2026-04-24/plans/owner-dashboard-design.md` | 2026-05-04 | Same route prefix inaccuracy as frontend-redesign doc. Routes are `/dashboard/owner/*` in code, not `/owner/*` as claimed. |
| One Check-in Per Day | `2026-05-11/plans/one-checkin-per-day-design.md` | 2026-05-11 | Design philosophy changed: plan = reference menu, not schedule. Free day logging replaces per-day restriction. |
| One Check-in Per Day (Plan) | `2026-05-11/plans/one-checkin-per-day-plan.md` | 2026-05-11 | Implementation plan for the above removed feature. |
