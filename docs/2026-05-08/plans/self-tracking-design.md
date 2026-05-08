# Owner / Trainer Self-Tracking 设计

**状态**：Approved
**作者**：Eric
**日期**：2026-05-08

## 背景与目标

Owner 和 Trainer 在 Personal 菜单分类下需要两个新页面：

- **My Training** — 自己给自己打训练卡，可从 template 起手或 freestyle 临时设计
- **My Nutrition** — 自己给自己打饮食卡，规则同上

每次打卡完成后弹出 checkbox：是否将此次内容**保存为 template**。勾上则在 Templates 列表里创建一份新模板（`createdBy = self`），可被分配给 member。

每个 domain 各有一个**独立的历史 calendar 页面**（不混合训练/饮食）。

此功能**仅 owner 与 trainer 可用**，member 无入口、API 直接 403。

## 不在范围内

- member 角色的任何变化
- "ongoing assigned plan" 概念扩展给 owner/trainer（即不存在分配给自己的"当前 plan"）
- 训练 / 饮食 plan 的"周期排程"（schedule / weekly pattern）—— self-tracking 是按天独立打卡，不需要 schedule
- 多个 active 训练 session 并存
- 同一天多条饮食 log（一天一条，唯一索引保证）

---

## 设计 ① — 数据模型

新建两个完全独立的 mongoose model，schema 内联定义所有 sub-schema，**不 import** 任何 member 端的 sub-schema（如 `PlanDaySchema`、`MealItemSchema`、`SessionSetSchema`、`DailyLogMealSchema`）。

### `SelfWorkoutLog`（collection：`selfworkoutlogs`）

```ts
interface ISelfWorkoutSet {
  exerciseId: ObjectId;
  exerciseName: string;
  groupId: string;
  isSuperset: boolean;
  isBodyweight: boolean;
  setNumber: number;
  prescribedRepsMin: number | null;   // freestyle 时可为 null
  prescribedRepsMax: number | null;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: Date | null;
}

interface ISelfWorkoutLog {
  userId: ObjectId;                         // owner / trainer 自己
  startedAt: Date;
  completedAt: Date | null;
  sourceTemplateId: ObjectId | null;        // 选 template 起手则填，freestyle 为 null
  sourceTemplateDayNumber: number | null;
  dayName: string;                          // 'Push Day' / 'Freestyle' / 用户自定义
  sets: ISelfWorkoutSet[];
  rpe: number | null;
  note: string | null;
}
```

索引：`{ userId: 1, startedAt: -1 }`、`{ userId: 1, completedAt: 1 }`

### `SelfNutritionLog`（collection：`selfnutritionlogs`）

```ts
interface ISelfMealItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  // 与 IMealItem 形状一致的可选 micro 字段：fiber, sugar, salt, saturated,
  // polyunsaturated, monounsaturated, polyols, cholesterol, sodium, potassium,
  // transFat（每个都是 number | undefined）
}

interface ISelfMeal {
  name: string;
  order: number;
  completed: boolean;
  items: ISelfMealItem[];
}

interface ISelfNutritionLog {
  userId: ObjectId;
  date: string;                             // 'YYYY-MM-DD'
  sourceTemplateId: ObjectId | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;                         // 'Training Day' / 'Freestyle' / 自定义
  meals: ISelfMeal[];
  dayCompleted: boolean;
}
```

索引：`{ userId: 1, date: 1 }`（**unique**）

### 设计要点

- `userId` 取代 `memberId`，明确 self-tracking 语义
- `sourceTemplateId` 仅作快照引用——template 后期改/删不影响历史 log，因为完整 days/meals 已经写入
- TypeScript interface 也独立定义，不复用 `IMealItem` / `ISessionSet` / `IPlanDay`
- 重复 ~50 行 schema 的成本可接受，换来未来 self / member 任一边演进时零相互污染

---

## 设计 ② — Repository 与 API 路由

### Repository

`src/lib/repositories/self-workout-log.repository.ts`

```ts
interface ISelfWorkoutLogRepository {
  create(input: Omit<ISelfWorkoutLog, '_id'>): Promise<ISelfWorkoutLog>;
  findById(id: string, userId: string): Promise<ISelfWorkoutLog | null>;
  findActive(userId: string): Promise<ISelfWorkoutLog | null>;          // completedAt === null
  findByUserMonth(userId: string, year: number, month: number): Promise<ISelfWorkoutLog[]>;
  appendSet(id: string, userId: string, set: ISelfWorkoutSet): Promise<ISelfWorkoutLog>;
  updateSet(id: string, userId: string, setIndex: number, patch: Partial<ISelfWorkoutSet>): Promise<ISelfWorkoutLog>;
  complete(id: string, userId: string, rpe: number | null, note: string | null): Promise<ISelfWorkoutLog>;
  delete(id: string, userId: string): Promise<void>;
}
```

`src/lib/repositories/self-nutrition-log.repository.ts`

```ts
interface ISelfNutritionLogRepository {
  upsertByDate(userId: string, date: string, log: Omit<ISelfNutritionLog, '_id' | 'userId' | 'date'>): Promise<ISelfNutritionLog>;
  findByDate(userId: string, date: string): Promise<ISelfNutritionLog | null>;
  findByUserMonth(userId: string, year: number, month: number): Promise<ISelfNutritionLog[]>;
  delete(userId: string, date: string): Promise<void>;
}
```

每个方法都强制带 `userId` 参数，所有 query 都包含 `{ userId }`，从仓库层杜绝跨用户读写。

### API 路由（全部位于 `/api/me/...`）

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/api/me/workout-logs` | 开始一次新 self workout（body：`{ sourceTemplateId?, sourceTemplateDayNumber?, dayName, plannedSets[] }`） |
| `GET` | `/api/me/workout-logs?year=&month=` | 月维度列表 |
| `GET` | `/api/me/workout-logs/active` | 当前未完成的（如有） |
| `GET` | `/api/me/workout-logs/:id` | 单条详情 |
| `POST` | `/api/me/workout-logs/:id/sets` | 加一组 |
| `PATCH` | `/api/me/workout-logs/:id/sets/:setIndex` | 更新某组的 actualWeight / actualReps / completedAt |
| `POST` | `/api/me/workout-logs/:id/complete` | 完成（body：`{ rpe?, note?, saveAsTemplate?: { name, description? } }`） |
| `DELETE` | `/api/me/workout-logs/:id` | 删除 |
| `GET` | `/api/me/nutrition-logs?year=&month=` | 月维度列表 |
| `GET` | `/api/me/nutrition-logs/:date` | 某天 log |
| `PUT` | `/api/me/nutrition-logs/:date` | 写/覆盖某天（body：完整 log 内容 + 可选 `saveAsTemplate`） |
| `DELETE` | `/api/me/nutrition-logs/:date` | 删除 |

### 授权规则

所有 `/api/me/...` 在 handler 顶部统一：

```ts
const session = await auth();
if (!session?.user) return new Response('Unauthorized', { status: 401 });
if (session.user.role !== 'owner' && session.user.role !== 'trainer') {
  return new Response('Forbidden', { status: 403 });
}
const userId = session.user.id;   // userId 永远从 session 读，body 内的任何 userId/memberId 字段被忽略
```

### "保存为 template" 处理

`POST /api/me/workout-logs/:id/complete` 与 `PUT /api/me/nutrition-logs/:date` 都接受可选字段：

```ts
saveAsTemplate?: {
  name: string;            // 必填，前端 checkbox 勾上后展开 input，未填不能 submit
  description?: string;
}
```

后端流程（事务内）：
1. 写入 / 更新 self log
2. 若 `saveAsTemplate` 存在：
   - **workout**：把 sets 按 groupId 还原成 `IPlanDay`（保留 prescribedRepsMin/Max、isSuperset、isBodyweight、exerciseId、exerciseName，丢弃 actual* 与 completedAt），写入 `PlanTemplate`，`createdBy = userId`
   - **nutrition**：把 meals 还原成 `IDayType`（保留 name/order/items，丢弃 completed flag），写入 `NutritionTemplate`，`createdBy = userId`
3. response 带新 template 的 `_id`，前端 toast：「已保存为模板 → 跳转」

---

## 设计 ③ — UI 页面与组件

### 路由（owner / trainer 对称）

| 角色 | 路径 | 用途 |
|---|---|---|
| owner | `/owner/my-training` | 训练主页：今日入口 / 续打 |
| owner | `/owner/my-training/session/[id]` | 单次 workout 逐组打卡页 |
| owner | `/owner/my-training/calendar` | 训练历史 calendar |
| owner | `/owner/my-nutrition` | 饮食主页：今日 day view（可切 date） |
| owner | `/owner/my-nutrition/calendar` | 饮食历史 calendar |
| trainer | `/trainer/my-training`、`/trainer/my-training/session/[id]`、`/trainer/my-training/calendar`、`/trainer/my-nutrition`、`/trainer/my-nutrition/calendar` | 同上 |

`page.tsx` 仅做 role guard 与 session 读取，render 共享 client component。

### 共享客户端组件（新建，全部位于 `src/components/self-tracking/`）

- `start-workout-card.tsx` — 主页顶部入口，三按钮：**Continue**（如有 active log）/ **From Template** / **Freestyle**
- `template-day-picker-dialog.tsx` — template picker，仅列 `createdBy === session.user.id` 的 templates（owner 看自己的、trainer 看自己的，互不可见）；选中后选 day，触发 `POST /api/me/workout-logs`
- `self-workout-session.tsx` — 仿 member 端 session 页：每组 PATCH 实时保存；"Add Set" 加临时 set；freestyle 模式下出现 "Add Exercise"（用 `<ExerciseLibraryPicker>`）
- `complete-workout-dialog.tsx` — 完成 dialog：rpe（1–10 选择器）+ note + **`Save as template` checkbox**（勾上展开 name input + 可选 description；未填 name 时 Submit 禁用）
- `self-workout-calendar.tsx` — 月视图，结构参考 `WorkoutCalendar` 但读 self log；点击某天弹**只读** detail panel（历史 log 不允许在 calendar 路径下编辑——若要修改需走"删除 + 重新打卡"。当日仍未完成的 active log 通过主页"Continue"按钮进入 session 页编辑，不在 calendar 路径下）
- `self-nutrition-day-view.tsx` — 仿 `DailyNutritionView`：date 切换 + meal sections + macro summary；底部 **`Save as template` checkbox**（同样展开 name input）
- `self-nutrition-calendar.tsx` — 饮食 calendar，每天 marker 显示该天 macro 总览；点击非今天的某天进入**只读** day view；点击今天则跳到 `/.../my-nutrition` 主页（可编辑）

### 起步流程

**Freestyle workout**：点 "Freestyle" → `POST /api/me/workout-logs` 创建 `dayName: 'Freestyle'` 的空 log → 跳转到 session 页 → 用户 `<ExerciseLibraryPicker>` 加动作、加 set、记录

**From Template workout**：选 template → 选 day → 后端把 day exercises 拷成 prescribed sets（actualWeight/Reps null）→ 进 session 页

**Freestyle nutrition**：直接进入今日 day view（`sourceTemplateId: null`），meals 默认 4 餐空壳（Breakfast/Lunch/Dinner/Snack），用户可改名/加/删

**From Template nutrition**：选 template → 选 dayType → 后端 `PUT /api/me/nutrition-logs/:date` 拷入 meals，completed 全为 false

### 复用已有 UI 原语（不新写）

`MacroPill`、`MacroSummaryCard`、`MealSection`、`FoodPickerDialog`、`<ExerciseLibraryPicker>`、`<Skeleton>`、`<Sheet>`、`<Dialog>`、`<Toast>`、`<PageHeader>`。这些与数据模型解耦，复用安全。

---

## 设计 ④ — 导航菜单（`src/components/shared/app-shell.tsx`）

**owner** 现有 `PERSONAL` group 增加两条：

```
PERSONAL
  My Training        → /owner/my-training
  My Nutrition       → /owner/my-nutrition
  Body Tests         → /owner/my-body-tests   (existing)
```

**trainer** 新增一个 `PERSONAL` group：

```
PERSONAL
  My Training        → /trainer/my-training
  My Nutrition       → /trainer/my-nutrition
```

calendar 子页**不**进 sidebar，主页右上有 "View Calendar →" 按钮跳转，对齐现有 member 端 plan → plan/calendar 的模式。

**member 角色 NAV 完全不变**。

---

## 设计 ⑤ — 测试策略

### Jest（unit / integration）

`__tests__/lib/repositories/`
- `self-workout-log.repository.test.ts` — CRUD、findActive、findByUserMonth、跨 userId 隔离断言（A 用户的 query 拿不到 B 用户的数据）
- `self-nutrition-log.repository.test.ts` — upsertByDate 唯一性、findByUserMonth、跨 userId 隔离

`__tests__/app/api/me/`
- `workout-logs/route.test.ts` — POST/GET、role guard（member → 403）、必填 body 字段缺失 → 400、`sourceTemplateId` 不存在 → 404
- `workout-logs/[id]/complete.route.test.ts` — saveAsTemplate 时新建 PlanTemplate 且 `createdBy = self`；name 缺失 → 400
- `nutrition-logs/[date]/route.test.ts` — PUT 上下行、saveAsTemplate 新建 NutritionTemplate
- `nutrition-logs/route.test.ts` — month query、role guard

`__tests__/components/self-tracking/`
- `complete-workout-dialog.test.tsx` — checkbox 勾上后必须填 name 才能 submit
- `self-nutrition-calendar.test.tsx` — 月内有 log 的天 highlight，点击触发 onSelect 回调

### Playwright（E2E）`e2e/self-tracking/`

- `trainer-freestyle-workout.spec.ts` — trainer 登录 → My Training → Freestyle → 加两动作各 3 组 → 完成 → calendar 看到这天
- `trainer-template-workout.spec.ts` — 从 template 起手 → 完成时勾 save as template → 验证 trainer/plans 列表新出现这条 template
- `owner-nutrition-day.spec.ts` — owner 编辑今日饮食 → save as template → 验证 owner/nutrition-templates 新出现
- `member-no-access.spec.ts` — member 登录直接 fetch `/api/me/workout-logs` → 403；侧边栏不存在 My Training / My Nutrition 入口

---

## 实现拆分（写 implementation plan 时参考）

1. **Stage 1**：Models + Repositories + 单元测试（不带 API、不带 UI）
2. **Stage 2**：API 路由 `/api/me/workout-logs/*`（不含 saveAsTemplate）+ integration tests
3. **Stage 3**：API 路由 `/api/me/nutrition-logs/*`（不含 saveAsTemplate）+ integration tests
4. **Stage 4**：训练侧 UI（主页 / session 页 / calendar）
5. **Stage 5**：饮食侧 UI（day view / calendar）
6. **Stage 6**：saveAsTemplate 后端逻辑 + 前端 checkbox UI + 相应测试
7. **Stage 7**：导航菜单调整 + role guard + 整体 E2E

每个 stage 结束后跑 `pnpm test` + `pnpm lint` + `/simplify`。
