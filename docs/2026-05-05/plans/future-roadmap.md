# POWER_GYM — Future Roadmap

**Date**: 2026-05-05  
**Status**: Backlog

---

## Current State (as of 2026-05-05)

All planned features are complete and tested:
- Auth, Training Plans, Nutrition, Body Tests, Progress Charts, Calendar, Check-ins, Equipment, Member/Trainer Hubs, Email Notifications, Mobile Responsive
- Training Module Refactor (Plan B): ExerciseNotePanel, WorkoutCompleteModal, WorkoutCalendar, trainer log-on-behalf, RPE/memberNote on completion
- 106 E2E tests passing, Jest unit tests passing

---

## Backlog Items

### A — 数据导出 (Data Export)

**Priority**: Medium  
**Effort**: Small–Medium

Export body test history and training session records to CSV or PDF.

**Scope:**
- Body tests: export all entries for a member (date, weight, BF%, lean mass, fat mass)
- Training sessions: export session history (date, day name, sets × reps per exercise)
- Accessible from trainer member hub (per-member export) and member progress page (self-export)
- Format: CSV first, PDF as stretch

**Technical approach:**
- Server-side CSV generation via a Route Handler returning `Content-Type: text/csv`
- PDF via `@react-pdf/renderer` or server-side `pdfmake` if needed

---

### B — 训练进阶追踪 (Progressive Overload Tracking)

**Priority**: High  
**Effort**: Medium

Show members and trainers whether the weight being lifted is progressing over time, and prompt for increases when appropriate.

**Scope:**
- In SessionLogger, each exercise card shows the last logged weight for that exercise
- A "recommended weight" badge: if last session's weight was hit for all sets, suggest +2.5kg
- Trainer member hub: progress tab shows per-exercise trend (weight over time line chart)
- Optional: 1RM trend chart (Epley estimate plotted over sessions)

**Technical approach:**
- Query last completed session for the same exercise on session start (cached in component state)
- Reuse existing Recharts setup for trend charts
- No new model changes required — reads from existing `WorkoutSession.sets[]`

---

### C — 器材管理完善 (Equipment Management Enhancement)

**Priority**: Low  
**Effort**: Small

Extend the existing equipment condition tracking with maintenance scheduling and usage stats.

**Scope:**
- Maintenance reminders: set a next-service date per equipment; dashboard badge when overdue
- Usage counter: increment when a session includes an exercise tagged to this equipment
- Filter equipment list by status (active / maintenance / retired)

**Technical approach:**
- Add `nextServiceDate` and `usageCount` fields to Equipment model
- Cron job or on-demand calculation for usage stats

---

### D — 生产部署准备 (Production Deployment)

**Priority**: High (when ready to go live)  
**Effort**: Medium

Make the app ready for real-world use.

**Scope:**
- Vercel deployment with environment variable configuration
- MongoDB Atlas production cluster setup
- Email provider (SMTP) with valid credentials
- Security audit: rate limiting on auth routes, CSRF review, input sanitisation
- Performance: add `loading.tsx` Suspense boundaries where missing, image optimisation
- Monitoring: error tracking (Sentry or similar)

**Technical approach:**
- `vercel env` for secrets management
- Auth.js production secret rotation
- `next/image` audit for all `<img>` tags

---

### E — 营养日志 (Member Nutrition Logging)

**Priority**: Medium  
**Effort**: Large

Let members log what they actually ate each day and compare against their assigned nutrition plan targets.

**Scope:**
- Member logs meals throughout the day: select food from the food library, enter grams/servings
- Daily summary: actual vs target macros (kcal, protein, carbs, fat) shown as progress bars
- History: 7-day or 30-day macro adherence chart
- Trainer view: see member's nutrition log alongside their plan in the member hub

**Technical approach:**
- New model: `NutritionLog` — `{ memberId, date, entries: [{ foodId, foodName, grams, macros }] }`
- New pages: `/member/nutrition/log` (today's log), `/member/nutrition/log/history`
- Extend trainer member hub nutrition tab to show log alongside plan
- Reuse existing food library and macro calculation utilities

---

## Suggested Priority Order

1. **D — Production Deployment** (when there's a real user or demo needed)
2. **B — Progressive Overload Tracking** (highest training value, no model changes)
3. **A — Data Export** (quick win, high practical value)
4. **E — Nutrition Logging** (large but high value for serious members)
5. **C — Equipment Enhancement** (low urgency)
