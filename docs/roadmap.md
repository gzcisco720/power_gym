# POWER_GYM — Roadmap

Backlog items not yet started. When an item is confirmed, remove it from here and create a Design + Implementation Plan in `docs/INDEX.md`.

---

## Backlog Items

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
2. **F — Additional Progress Charts** (low effort, nice to have)
3. **G — Push Notifications** (medium effort, low urgency given email exists)
4. **I — Training Plan Recommendations** (medium effort, lower priority)
5. **C — Equipment Enhancement** (low urgency)
