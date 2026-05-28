# Day Complete Confirm Dialog + Future Date Lockdown

**状态**：Approved
**作者**：Eric
**日期**：2026-05-08

## 背景与目标

Self-tracking 已合并 calendar popover 重构。两个待修小项浮现：

1. **Mark day complete 一点就提交，没有确认**——用户希望弹一个确认对话框，显示今天即将提交的 kcal、提示有 meal 未 ✓Completed，并允许"全部勾上后提交"或"按现状提交（未完成的不计）"两种选择。
2. **Calendar marker 上的 kcal 现在是按整个 plan 总和算（不区分 meal-level completed），但用户希望用 sealed-only**——只算 ✓Completed 的 meal items。
3. **Bug**：当前可以编辑未来日期的 nutrition log（顶部 → 按钮 + URL `?date=` 都不阻止），最晚应该是今天。

## 不在范围内

- 训练（workout）侧——这次只动饮食
- 历史 dayCompleted=true 数据迁移（既有 logs 的 meal completed 状态保持原样）
- MacroSummaryCard 的 macro 算法变化——见下面 ① 的语义区分
- 时区精度（采用 UTC 简单实现，详见 ⑤）

---

## 设计 ① — kcal 显示语义（三层）

| 显示位置 | 显示什么 | 数据计算 |
|---|---|---|
| `MacroSummaryCard`（顶部蛋白/碳水/脂肪饼图） | **All logged items**（不区分 meal completed） | `aggregate(log.meals)` 现有逻辑，**不变** |
| `DayCompleteBar` 左侧文字 — in-progress | `X kcal · N items logged` — **All logged** | 同上 |
| `DayCompleteBar` 左侧文字 — dayCompleted=true | `Day completed · X kcal` — **sealed** | 只算 `meal.completed === true` 的 items |
| Confirm dialog 主数字 | **Sealed kcal**（"你即将 sealed 多少"） | 同上，配 "Mark all" 时改为全部 |
| **Calendar marker kcal** | **Sealed kcal** | 同上 |

清晰区分：
- **正在编辑的页面**（MacroSummaryCard + DayCompleteBar in-progress）→ "已 logged"，给用户即时反馈
- **历史/sealing 时刻**（Calendar marker、DayCompleteBar completed、Confirm dialog）→ "已 sealed"，反映"这天最终算了多少"

---

## 设计 ② — Confirm Dialog 行为

新组件 `<DayCompleteConfirmDialog>`，从 `<DayCompleteBar>` 的 Mark day complete 点击触发。Dialog 按 meal completed 分布渲染三种状态：

### 状态 A — 全部 meal 已 ✓Completed

```
Mark today as complete?
2000 kcal across 4 meals ready to submit.

[Submit]    [Cancel]
```

点 Submit → `onConfirm({ markAll: false })` → 父组件 PUT `dayCompleted: true` (meals 不动)。

### 状态 B — 部分 meal 已 ✓Completed

```
Mark today as complete?
3 of 4 meals completed (1800 kcal).
1 meal not marked complete and will not count.

[Mark all & submit (2000 kcal)]
[Submit completed only (1800 kcal)]
[Cancel]
```

- **Mark all & submit** → `onConfirm({ markAll: true })` → 父组件把所有 meal `completed=true` + `dayCompleted=true` 一次性 PUT
- **Submit completed only** → `onConfirm({ markAll: false })` → 保留 meal completed 状态原样，PUT `dayCompleted: true`

### 状态 C — 没有 meal 被 ✓Completed

```
Mark today as complete?
0 of 4 meals completed.

[Mark all & submit (2000 kcal)]
[Cancel]
```

"Submit completed only" 隐藏（sealed=0 没意义）。

### Dialog Props

```ts
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  totalMeals: number;            // log.meals.length
  completedMeals: number;        // log.meals.filter(m => m.completed).length
  sealedKcal: number;            // sum of items in completed meals
  totalKcal: number;             // sum of all items
  onConfirm: (opts: { markAll: boolean }) => void | Promise<void>;
  submitting: boolean;
}
```

Component decides which state (A/B/C) to render based on `completedMeals` vs `totalMeals`:
- `completedMeals === totalMeals` → A
- `completedMeals === 0` → C
- otherwise → B

---

## 设计 ③ — 数据流变化

### `SelfNutritionDayView` 新增 helper

```ts
function sealedAggregate(meals: ISelfMeal[]): { kcal: number } {
  return meals
    .filter(m => m.completed)
    .reduce((s, m) => ({ kcal: s.kcal + m.items.reduce((sk, it) => sk + it.kcal, 0) }), { kcal: 0 });
}
```

### `markDayComplete` 改为接受 mode

```ts
async function markDayComplete(opts: { markAll: boolean }): Promise<void> {
  if (!log) return;
  setSubmittingComplete(true);
  const meals = opts.markAll
    ? log.meals.map(m => ({ ...m, completed: true }))
    : log.meals;
  const next: SelfNutritionLog = { ...log, meals, dayCompleted: true };
  await persist(next);
  setSubmittingComplete(false);
  setConfirmOpen(false);
}
```

### `DayCompleteBar` 行为变化

- 主按钮 onClick 不再直接调 `onMarkComplete()`，而是 `onRequestComplete()` 触发 dialog 打开（父组件管 dialog 状态）
- 已 completed 时 `disabled` 状态不变（点不动）
- props 改：`onRequestComplete` 替代 `onMarkComplete`，`submitting` 仍传（在 dialog 关闭后回到 idle）

### `DayCompleteBar` 文字（不变核心，但确认）

| dayCompleted | 文字 |
|---|---|
| false | `{totalKcal} kcal · {totalItems} {item/items} logged` （all logged，与现状一致） |
| true | `Day completed · {sealedKcal} kcal` （sealed） |

---

## 设计 ④ — Calendar marker kcal 改为 sealed-only

### `nutrition-calendar-popover.tsx` 内的 `RawLog` 扩展

```ts
interface RawLog {
  date: string;
  dayLabel: string;
  dayCompleted: boolean;
  meals: { completed: boolean; items: { kcal: number }[] }[]; // ← 加 completed
}
```

API 已经返回完整 SelfNutritionLog 对象（包括 `meals[].completed`），只是 client 之前的 type 没列出来。

### kcal 计算改成 sealed-only

```ts
// before:
kcal: l.meals.flatMap((m) => m.items).reduce((s, it) => s + it.kcal, 0)

// after:
kcal: l.meals
  .filter((m) => m.completed)
  .flatMap((m) => m.items)
  .reduce((s, it) => s + it.kcal, 0)
```

**`SelfNutritionCalendar` 组件本身不变**——它只负责渲染传入的 `entries`，不关心 entries 怎么算的。

### 影响测试

`__tests__/components/self-tracking/nutrition-calendar-popover.test.tsx` 的 mock fetch 返回需要带 `completed: true` 给一个 meal，否则 sealed kcal = 0，测试会 fail。

```ts
// 改 mock：
json: () => Promise.resolve([
  { date: today, dayLabel: 'Freestyle', dayCompleted: false,
    meals: [{ completed: true, items: [{ kcal: 1500 }] }] },
]),
```

---

## 设计 ⑤ — 未来日期防护（UTC 简单实现）

### 三个入口防护

**A. `SelfNutritionDayView` 顶部 → 按钮**

```tsx
const today = new Date().toISOString().slice(0, 10);
const nextDate = shiftDate(date, 1);
const canGoNext = nextDate <= today;

<Button
  variant="ghost" size="sm"
  onClick={() => setDate(nextDate)}
  disabled={readOnly || !canGoNext}
>
  {nextDate} →
</Button>
```

← 按钮永远可用（往过去走无限制）。

**B. `SelfNutritionCalendar` 月历未来日期格**

加一个 `today` 比较，未来日期格设为 disabled，无论该日是否有 entry：

```tsx
const todayISO = new Date().toISOString().slice(0, 10);

// In cell render:
const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const isFuture = dateStr > todayISO;
const canSelect = entry !== undefined && !isFuture;

<button
  onClick={() => canSelect && onSelect(entry)}
  disabled={!canSelect}
  ...
>
```

**C. page.tsx URL `?date=` 验证**

```tsx
const today = new Date().toISOString().slice(0, 10);
const date = rawDate && DATE_RE.test(rawDate) && rawDate <= today
  ? rawDate
  : today;
```

未来日期 → silent fallback 到今天，无 toast、无错误。

### 时区取舍

`new Date().toISOString()` 是 UTC 时间。在 UTC+8 凌晨（local 0:00–7:59）用户视角的"今天"是 local date，但 ISO 还是前一天。这意味着 local 凌晨用户**短暂**地能编辑"明天"（其实是 UTC 还是今天）。

**接受这个 trade-off**——self-tracking 凌晨编辑的概率极低，UTC 实现简单一致。如未来有问题再升级到 `Intl.DateTimeFormat` 解析 local。

---

## 设计 ⑥ — 文件变化总览

### 新建

```
src/components/self-tracking/day-complete-confirm-dialog.tsx
__tests__/components/self-tracking/day-complete-confirm-dialog.test.tsx
```

### 修改

```
src/components/self-tracking/day-complete-bar.tsx                 ← onMarkComplete → onRequestComplete
src/components/self-tracking/self-nutrition-day-view.tsx          ← 新增 sealed-aggregate, markDayComplete(mode), 渲染 dialog, → 按钮 disable, sealed kcal 计算
src/components/self-tracking/self-nutrition-calendar.tsx          ← 未来日期 disabled
src/components/self-tracking/nutrition-calendar-popover.tsx       ← RawLog 加 meals[].completed; kcal 计算改 sealed-only
src/app/(dashboard)/owner/my-nutrition/page.tsx                   ← URL ?date 验证 + future fallback
src/app/(dashboard)/trainer/my-nutrition/page.tsx                 ← 同上
__tests__/components/self-tracking/self-nutrition-calendar.test.tsx       ← 加未来日期 disabled 测试
__tests__/components/self-tracking/self-nutrition-day-view.test.tsx       ← 现有 markComplete 测试要走 dialog
__tests__/components/self-tracking/nutrition-calendar-popover.test.tsx    ← mock 加 meals[].completed
e2e/self-tracking/owner-nutrition-day.spec.ts                              ← markComplete E2E 加 dialog click 步骤
```

---

## 设计 ⑦ — 测试调整

### 新增测试

`day-complete-confirm-dialog.test.tsx` — 三状态 + cancel：
1. 状态 A：渲染 Submit + Cancel（2 按钮）；点 Submit fires `onConfirm({ markAll: false })`
2. 状态 B：渲染 3 按钮；Mark all → `markAll: true`，Submit completed only → `markAll: false`
3. 状态 C：Submit completed only 隐藏，只 Mark all + Cancel
4. Cancel：fires `onOpenChange(false)`，不调 `onConfirm`

### 已有测试更新

`self-nutrition-day-view.test.tsx`：
- "Mark day complete posts dayCompleted: true" — 改成：点 Mark day complete → dialog 打开 → 点 dialog 内 Submit → 验证 PUT 含 `dayCompleted: true`

`self-nutrition-calendar.test.tsx`：
- 加一个测试：未来日期 cell 无论 entry 与否都 disabled

`nutrition-calendar-popover.test.tsx`：
- mock fetch 返回的 meals 加 `completed: true`，匹配新的 sealed kcal 计算

`e2e/self-tracking/owner-nutrition-day.spec.ts`：
- "Mark day complete" 测试加 dialog 步骤——点击 → dialog 打开 → 点 Submit / Mark all → 验证按钮 disabled

---

## 实施拆分（写 implementation plan 时参考）

1. **Stage 1**：DayCompleteConfirmDialog 组件 + 测试
2. **Stage 2**：DayCompleteBar 重构（onMarkComplete → onRequestComplete）
3. **Stage 3**：SelfNutritionDayView 集成（sealed-aggregate helper、markDayComplete(mode)、dialog 渲染、→ 按钮 disable）
4. **Stage 4**：Calendar 未来日期 disable + 测试
5. **Stage 5**：NutritionCalendarPopover sealed kcal 计算 + 测试 mock 更新
6. **Stage 6**：page.tsx URL 验证（owner + trainer）
7. **Stage 7**：E2E mark-complete 走 dialog
8. **Stage 8**：Final smoke + INDEX 更新 + 删 plan
