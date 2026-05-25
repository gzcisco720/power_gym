# POWER_GYM — Roadmap

Backlog items not yet started. When an item is confirmed, remove it from here and create a Design + Implementation Plan in `docs/INDEX.md`.

---

## Backlog Items

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
2. **G — Push Notifications** (medium effort, low urgency given email exists)
3. **I — Training Plan Recommendations** (medium effort, lower priority)
