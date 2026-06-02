# POWER_GYM — Roadmap

Feature backlog for future Sprint planning.

---

## Mobile Screens — Implementation Order

Ordered by isolation (fewest cross-module dependencies first). Each item requires a new backend module + mobile screen.

### 🟢 Phase 1 — High Isolation (no cross-module dependencies)

| # | Feature | Roles | Notes |
|---|---|---|---|
| 1 | Equipment | Owner | Equipment list + condition reports · `equipment.model`, `condition-report.model` |
| 2 | Services | Owner | Service types list · `service-type.model` |
| 3 | Check-In | Member | Daily check-in action + history · `check-in.model`, `check-in-config.model` |
| 4 | Body Tests / My Body Tests | Member, Owner | Body composition history + entry · `body-test.model` · Jackson-Pollock formulas |
| 5 | My Health | Member | Injury records, medical history, medications · 3 independent sub-models |

### 🟡 Phase 2 — Medium Isolation (shared across roles, light dependencies)

| # | Feature | Roles | Notes |
|---|---|---|---|
| 6 | Invites | Owner, Trainer | Invite token list + create · `invite-token.model` · depends on role system |
| 7 | Billing | Owner, Trainer, Member | Payment history view · scope TBD (view-only vs full billing system) |
| 8 | My Schedule | Member | Session calendar · `scheduled-session.model` |

### 🔴 Phase 3 — Low Isolation (multi-module, implement last)

| # | Feature | Roles | Notes |
|---|---|---|---|
| 9 | Members | Owner, Trainer | Member list + detail sub-pages · links to training, nutrition, body tests |
| 10 | Trainers | Owner | Trainer list + detail · links to members |
| 11 | Training Templates | Owner, Trainer | Plan templates with exercises · `plan-template.model`, `exercise.model` |
| 12 | Nutrition Templates | Owner, Trainer | Nutrition templates with food items · `nutrition-template.model`, `food.model` |
| 13 | Calendar | Owner, Trainer | Session scheduling · `scheduled-session.model` · recurring series |
| 14 | My Training | Owner, Trainer, Member | Assigned training plan + workout logging · multi-model |
| 15 | My Nutrition | Owner, Trainer, Member | Assigned nutrition plan + daily logging · multi-model |
| 16 | Journey | Member | Aggregate progress view · pulls from training, nutrition, body tests |
