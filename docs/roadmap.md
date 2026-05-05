# POWER_GYM — Roadmap

Backlog items not yet started. When an item is confirmed, remove it from here and create a Design + Implementation Plan in `docs/INDEX.md`.

---

## Backlog Items

### A — 数据导出 (Data Export)

**Priority**: Medium | **Effort**: Small–Medium

Export body test history and training session records to CSV or PDF.

**Scope:**
- Body tests: export all entries for a member (date, weight, BF%, lean mass, fat mass)
- Training sessions: export session history (date, day name, sets × reps per exercise)
- Accessible from trainer member hub (per-member export) and member progress page (self-export)
- Format: CSV first, PDF as stretch goal

**Technical approach:**
- Server-side CSV generation via a Route Handler returning `Content-Type: text/csv`
- PDF via `@react-pdf/renderer` or server-side `pdfmake` if needed

---

### B — 训练进阶追踪 (Progressive Overload Tracking)

**Priority**: High | **Effort**: Medium

Show members and trainers whether weight is progressing over time, and prompt for increases when appropriate.

**Scope:**
- In SessionLogger, each exercise card shows the last logged weight for that exercise
- A "recommended weight" badge: if last session's weight was hit for all sets, suggest +2.5kg
- Trainer member hub: progress tab shows per-exercise weight trend over time
- Optional: 1RM trend chart (Epley estimate plotted over sessions)

**Technical approach:**
- Query last completed session for the same exercise on session start
- Reuse existing Recharts setup for trend charts
- No new model changes required — reads from existing `WorkoutSession.sets[]`

---

### C — 器材管理完善 (Equipment Management Enhancement)

**Priority**: Low | **Effort**: Small

Extend existing equipment condition tracking with maintenance scheduling and usage stats.

**Scope:**
- Maintenance reminders: set a next-service date per equipment; dashboard badge when overdue
- Usage counter: increment when a session includes an exercise tagged to this equipment
- Filter equipment list by status (active / maintenance / retired)

**Technical approach:**
- Add `nextServiceDate` and `usageCount` fields to Equipment model
- Cron job or on-demand calculation for usage stats

---

### D — 生产部署准备 (Production Deployment)

**Priority**: High (when ready to go live) | **Effort**: Medium

Make the app ready for real-world use.

**Scope:**
- Vercel deployment with environment variable configuration
- MongoDB Atlas production cluster setup
- Email provider (SMTP) with valid credentials
- Security audit: rate limiting on auth routes, CSRF review, input sanitization
- Performance: audit `loading.tsx` Suspense boundaries, image optimization
- Monitoring: error tracking (Sentry or similar)

**Technical approach:**
- `vercel env` for secrets management
- Auth.js production secret rotation
- `next/image` audit for all `<img>` tags

---

### E — 营养日志 (Member Nutrition Logging)

**Priority**: Medium | **Effort**: Large

Let members log what they actually ate each day and compare against assigned nutrition plan targets.

**Scope:**
- Member logs meals: select food from library, enter grams/servings
- Daily summary: actual vs target macros (kcal, protein, carbs, fat) as progress bars
- History: 7-day or 30-day macro adherence chart
- Trainer view: nutrition log alongside plan in member hub

**Technical approach:**
- New model: `NutritionLog` — `{ memberId, date, entries: [{ foodId, foodName, grams, macros }] }`
- New pages: `/member/nutrition/log`, `/member/nutrition/log/history`
- Reuse existing food library and macro calculation utilities

---

### F — 更多进度图表 (Additional Progress Charts)

**Priority**: Low | **Effort**: Small

Richer analytics on the Progress page.

**Scope:**
- Body weight trend line overlaid with BF% trend
- Training volume trend (total sets or total volume per week)
- Optionally: 1RM trend across all exercises in one view

---

### G — 训练提醒 / 推送通知 (Training Reminders / Push Notifications)

**Priority**: Low | **Effort**: Medium

Notify members when a scheduled session is approaching via Web Push (in addition to existing email reminders).

**Scope:**
- Web Push subscription management for members
- Push notification sent N hours before a scheduled session
- Member can opt in/out from settings page

---

### H — 会员训练反馈 (Member Workout Feedback)

**Priority**: Medium | **Effort**: Small

After completing a session, members leave a subjective rating for the trainer to review.

**Scope:**
- On workout completion modal: RPE (1–10), fatigue level, free-text notes
- Trainer view: feedback history per member in member hub
- Aggregate: trainer dashboard shows average RPE trend across all members

---

### I — 训练计划推荐 (Training Plan Recommendations)

**Priority**: Low | **Effort**: Medium

Use member profile data to suggest suitable plan templates when a trainer assigns a plan.

**Scope:**
- Input signals: fitnessGoal, fitnessLevel, injury conditions from member profile
- On plan assignment, surface 2–3 recommended templates ranked by fit score
- Trainer can override and pick any template as usual

---

## Suggested Priority Order

1. **D — Production Deployment** (when there's a real user or demo needed)
2. **B — Progressive Overload Tracking** (highest training value, no model changes)
3. **A — Data Export** (quick win, high practical value)
4. **H — Member Workout Feedback** (small effort, high trainer value)
5. **E — Nutrition Logging** (large but high value for serious members)
6. **F — Additional Progress Charts** (low effort, nice to have)
7. **G — Push Notifications** (medium effort, low urgency given email exists)
8. **I — Training Plan Recommendations** (medium effort, lower priority)
9. **C — Equipment Enhancement** (low urgency)
