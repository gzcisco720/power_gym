# POWER_GYM — Roadmap

Backlog items not yet started. When an item is confirmed, remove it from here and create a Design + Implementation Plan in `docs/INDEX.md`.

---

## V2 Pipeline (active — `feature/v2`)

These items are confirmed and in progress. Not backlog.

| # | Item | Status |
|---|---|---|
| V2-1 | Workspace restructure (web/ landing/ backend/) | ✅ Done |
| V2-2 | NestJS backend init | ✅ Done |
| V2-3 | Backend API migration (all 12 domains) | 🔄 Planning — planner agent in progress |
| V2-4 | Web frontend migration (replace Route Handlers, swap Next-Auth → NestJS JWT) | ⏳ After V2-3 |
| V2-5 | Mobile app (React Native) | ⏳ After V2-4 |

---

## Backlog Items

### D — 生产部署准备 (Production Deployment)

**Priority**: High (when V2 backend is stable) | **Effort**: Medium

Make the app ready for real-world use. Scope needs revisiting once V2 architecture is in place (Vercel for web, separate host for NestJS).

**Scope:**
- NestJS deployment (Railway / Render / EC2)
- Vercel deployment for Next.js web
- MongoDB Atlas production cluster setup
- Email provider (SMTP) with valid credentials
- Security audit: rate limiting, CSRF review, input sanitization
- Monitoring: error tracking (Sentry or similar)

---

### G — 训练提醒 / 推送通知 (Training Reminders / Push Notifications)

**Priority**: Low | **Effort**: Medium

Notify members when a scheduled session is approaching via Web Push.

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

1. **V2-3 → V2-4 → V2-5** (current focus)
2. **D — Production Deployment** (after V2 is stable)
3. **G — Push Notifications** (low urgency given email exists)
4. **I — Training Plan Recommendations** (lowest priority)
