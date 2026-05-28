# My Nutrition / My Training Calendar Popover + Day Complete 重构设计

**状态**：Draft
**作者**：Eric
**日期**：2026-05-08

## 背景与目标

Self-tracking feature 刚合并进 main，但用户在浏览器实测后发现三个 UX 问题：

1. **缺少整体 Day Complete 操作** — `SelfNutritionDayView` 只有每个 meal 的 ✓Completed toggle，没有 day-level 的"今天搞定"主按钮，模型字段 `dayCompleted` 也没被 UI 用上。
2. **Calendar 看不出哪天有记录** — `SelfNutritionCalendar` 的有 log 天 highlight 用 `bg-foreground/10`，在深色主题上几乎不可见，没有 kcal 数字，没有任何 dot/tag。
3. **Calendar 占独立全宽页面浪费空间** — `/owner/my-nutrition/calendar`、`/trainer/my-nutrition/calendar` 等 4 条路由本质上是简单的月历视图，左半屏完全空白。

本设计将所有 4 条 calendar 路由替换为可复用的 popover 组件，加 day-level Complete 按钮，并在月历 cell 上显示 kcal + dot marker。

## 不在范围内

- `MealSection` 组件本身的修改（meal-level ✓Completed 保留）
- 历史数据迁移（`dayCompleted` 默认 false 即可）
- Member 角色相关变化（不涉及）
- Body Tests / Settings 等其他 PERSONAL 区域
- Workout session 页（`/session/[id]`）的任何变化

---

## 设计 ① — 文件变化总览

### 删除（4 个 page 路由 + 2 个 client 共 6 个文件）

```
src/app/(dashboard)/owner/my-training/calendar/page.tsx
src/app/(dashboard)/owner/my-nutrition/calendar/page.tsx
src/app/(dashboard)/trainer/my-training/calendar/page.tsx
src/app/(dashboard)/trainer/my-nutrition/calendar/page.tsx
src/components/self-tracking/my-training-calendar-client.tsx
src/components/self-tracking/my-nutrition-calendar-client.tsx
```

`SelfWorkoutCalendar` 与 `SelfNutritionCalendar` **保留**——它们是纯展示月历组件，会在 popover 内复用。

### 新增（2 个文件）

```
src/components/self-tracking/nutrition-calendar-popover.tsx
src/components/self-tracking/workout-calendar-popover.tsx
```

每个 popover 组件：

- 自管 `open` state
- 接受 `trigger: ReactNode`（父传入 button），用 shadcn `<Popover><PopoverTrigger asChild>` 模式
- 自动 fetch 月份列表（`/api/me/nutrition-logs?year=&month=` 或 workout 对应）
- 支持月份切换（onMonthChange 内部处理）
- 接受 `onSelect: (date: string) => void` 回调，由父组件决定跳哪里

### 修改（5 个文件）

```
src/components/self-tracking/self-nutrition-day-view.tsx     ← 重构最大
src/components/self-tracking/self-nutrition-calendar.tsx     ← 改 cell 视觉
src/components/self-tracking/self-workout-calendar.tsx       ← 改 cell 视觉
src/app/(dashboard)/owner/my-nutrition/page.tsx              ← 替换 PageHeader 链接为 📅 popover trigger
src/app/(dashboard)/trainer/my-nutrition/page.tsx            ← 同上
src/app/(dashboard)/owner/my-training/page.tsx               ← 同上
src/app/(dashboard)/trainer/my-training/page.tsx             ← 同上
```

7 个修改点（4 个 page 算独立修改）。

### 数据模型 — 不变

- `ISelfMeal.completed` 保留（meal toggle 仍用）
- `ISelfNutritionLog.dayCompleted` 已存在，UI 现在第一次读/写
- API 路由不变（`PUT /api/me/nutrition-logs/[date]` 已支持 `dayCompleted`）

---

## 设计 ② — Popover 入口

### Nutrition：两个触发器

**入口 A — 中间日期字本身**（在 `SelfNutritionDayView` 顶部 date 切换条）

```
←  2026-05-07     [2026-05-08 ▾]    2026-05-09  →
                  ↑ <button> with hover underline + 12px chevron
```

中间日期变成 `<button>`，hover 加下划线，尾部一个 lucide `<ChevronDown size=12 />` 提示可点。点击 → popover 在 button 下方弹出，月历直接在那。

**入口 B — PageHeader 📅 图标**（替换当前的 `View Calendar →` 链接）

PageHeader 右侧 actions 当前是：
```tsx
<Link href="/owner/my-nutrition/calendar">View Calendar →</Link>
```

改成：
```tsx
<NutritionCalendarPopover
  trigger={
    <button aria-label="Open calendar" className="...">
      <Calendar className="h-4 w-4" />
    </button>
  }
  onSelect={(date) => /* setDate via context or URL param */}
/>
```

但 PageHeader 是 server component 渲染的 `<Link>`，要改成 client trigger 需要把 trigger 包到 client component 里。具体做法见 ⑤。

### Training：一个触发器

`StartWorkoutCard` 主页**没有日期切换条**（它显示 "Continue / From Template / Freestyle"），所以 training 端只有 PageHeader 📅 这一个入口。Session 页（`/session/[id]`）不需要 calendar popup。

### Popover 行为

- shadcn `<Popover>` 默认行为：点外部关闭、Esc 关闭、focus trap
- popover 宽 280px、高 ~310px（cell 加大后）
- 选中某天 → `onSelect(date)` 同步触发 + popover 关闭
- 关闭后焦点回到 trigger（accessibility）

### 跨日期跳转语义

popover 选某天 → `setDate(那天)`，`SelfNutritionDayView` 重新 fetch + 渲染那天的 log。**始终 editable** —— 跳到过去某天也允许继续编辑。简单一致。

---

## 设计 ③ — Day-Complete UI

### 组件层级

```
SelfNutritionDayView
├─ DateSwitcher (top)            ← 中间日期是 popover trigger
├─ MacroSummaryCard
├─ MealSection × 4               ← 完全不动，meal-level ✓Completed 保留
├─ FoodPickerDialog
├─ SaveDayAsTemplate (regular block, not sticky)
└─ DayCompleteBar (sticky bottom) ← 新增
```

### `DayCompleteBar` 设计

```tsx
<div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3
                bg-background/95 backdrop-blur-sm border-t border-border/60
                flex items-center justify-between gap-3">
  <span className="text-xs text-foreground/65">
    {dayCompleted
      ? <><Check className="h-3.5 w-3.5 text-emerald-500 inline mr-1" />Day completed · {kcal} kcal</>
      : <>{kcal} kcal · {totalItems} {totalItems === 1 ? 'item' : 'items'} logged</>}
  </span>

  {/*
    `kcal` = sum across all meal.items (existing aggregate macro)
    `totalItems` = sum of meal.items.length across all meals
    Both computed via useMemo from log.meals — matches the existing macro aggregation pattern.
  */}
  <Button
    onClick={markComplete}
    disabled={dayCompleted}
    variant={dayCompleted ? 'outline' : 'default'}
  >
    {dayCompleted ? 'Day completed ✓' : 'Mark day complete'}
  </Button>
</div>
```

### 关键行为

- 点 `Mark day complete` → PUT `/api/me/nutrition-logs/[date]` 把 `dayCompleted: true` 持久化 + 按钮立即变 disabled
- **完成后不可撤销**（按钮 disabled）—— 用户如有误点需用 API 工具或 console 改（接受这个限制）
- 即使已 complete，用户仍可继续 +Add Food / 删 item / 改 meal toggle —— `dayCompleted` 是声明，不会因后续编辑回滚
- `MealSection` 完全不改 prop，meal-level ✓ 维持原样

### `Save as template` 区块位置

保留在 `<SaveDayAsTemplate>` 当前位置（meal 列表下方），**不**进 sticky bar。理由：
- sticky bar 主操作是"完成今天"
- 保存模板是次要操作，分离更清晰
- 不增加 sticky bar 视觉密度

页面布局顺序（自上而下）：
1. PageHeader（含 📅 trigger）
2. DateSwitcher
3. MacroSummaryCard
4. MealSection × 4
5. SaveDayAsTemplate (普通块，随 scroll 走)
6. DayCompleteBar (sticky bottom，永远可见)

---

## 设计 ④ — Calendar Cell 视觉

### 状态机（4 种 cell 渲染）

| 状态 | 视觉 | 颜色 |
|---|---|---|
| 没 log | `数字`（dim 文字，无 dot 无 kcal） | `text-foreground/40` |
| 有 log + dayCompleted=false | `数字 / 1234kcal / •` | dot `bg-emerald-500/40`（半透浅色） |
| 有 log + dayCompleted=true | `数字 / 1234kcal / •` | dot `bg-emerald-500`（实色亮） |
| 今天本身（覆盖在上面三态上） | + `ring-1 ring-foreground/25` | — |
| popover 内选中态（覆盖） | + `bg-foreground/10`（轻 fill，不抢眼） | — |

### Cell 尺寸 + 版式

```
┌─────────┐  36px wide
│   8     │  数字 12px line-height 14px
│ 1234    │  kcal 10px text-emerald-300/80 (浅) 或 text-emerald-300 (亮)  — 仅当有 log
│   •     │  dot 4×4px round                                              — 仅当有 log
└─────────┘  44px tall
```

无 log 的天保持 44px 行高（防抖动），数字垂直居中。

### `SelfNutritionCalendar` & `SelfWorkoutCalendar` 修改

两个组件结构相同，要做的修改：

1. cell 容器从 `w-8 h-8 rounded-full` 改成 `w-9 h-11 rounded-md flex flex-col items-center justify-center`
2. 数字行单独包 `<span>`
3. 有 log 时下方加 kcal 行 + dot 行
4. 颜色 token 按上表
5. accessibility：`aria-label` 升级成 `Day {n}, {kcal} kcal, {completed ? 'completed' : 'in progress'}`

`SelfWorkoutCalendar` 没有 kcal —— 中间行换成 `dayName` 缩写（如 "Push"）—— 但 dayName 长字符串会撑爆 36px。要么用三字母缩写、要么 training cell 不显示 dayName 只显示 dot：

**Training cell 简化版**：

| 状态 | 视觉 |
|---|---|
| 没 session | `数字` |
| 有 completed session | `数字 / •` (实色 emerald) |

不显示 dayName，简化 + 与 nutrition 风格统一（dot 表存在，kcal 仅 nutrition 特有）。

---

## 设计 ⑤ — PageHeader 集成

### 问题

`PageHeader` 是 server component，接受 `actions: ReactNode`。当前传入的是 `<Link>`。要改成 popover trigger 需要 client 边界。

### 方案

`my-nutrition/page.tsx`、`my-training/page.tsx` 等 page 仍是 server component（保留 auth guard），但把 PageHeader 的 `actions` 改成传入一个 client component：

```tsx
// owner/my-nutrition/page.tsx (server)
import { NutritionCalendarHeaderTrigger } from '@/components/self-tracking/nutrition-calendar-header-trigger';

return (
  <PageHeader
    title="My Nutrition"
    actions={<NutritionCalendarHeaderTrigger basePath="/owner/my-nutrition" />}
  />
);
```

`NutritionCalendarHeaderTrigger` 是 client component，包 `<NutritionCalendarPopover>`，`onSelect` 用 `useRouter().push(\`${basePath}?date=\${date}\`)` 通过 query param 通知父页面。

### Date 同步

`SelfNutritionDayView` 当前 date state 是局部的（`useState(initialDate)`）。要让 PageHeader 触发的 popover 跳日期，需要：

**方案 A — URL query param**

主页面接 `?date=YYYY-MM-DD` query。Day view 用 `useSearchParams` 读 date，不再自管状态。Popover 选某天 → 改 query。
- 优点：URL 是 source of truth，深链接友好（分享某天给他人）
- 缺点：每次切日期触发 router navigation（轻微开销）

**方案 B — Context**

页面包 `<DateContext.Provider>`，PageHeader trigger 和 day view 都通过 context 通信。
- 优点：无 navigation
- 缺点：更复杂、深链接不行

**推荐 A** —— URL 友好、与 Next.js 思路一致、navigation 开销小。

**Query 缺失时的默认值**：`?date=` 未提供 → fallback 到今天（`new Date().toISOString().slice(0, 10)`）。这是 page.tsx 在 server-render 时计算并传入，避免客户端首次 render 时 hydration mismatch。

### Day view 顶部触发器（入口 A）的实现

`SelfNutritionDayView` 顶部 date 字也是 popover trigger。这是 client 组件内部，无 server boundary 问题：

```tsx
<NutritionCalendarPopover
  basePath={basePath}
  trigger={
    <button className="...">
      {date} <ChevronDown className="h-3 w-3 inline" />
    </button>
  }
  onSelect={(d) => setDate(d) /* or update query param */}
/>
```

如果走方案 A（URL），统一用 `router.push(?date=...)`，state 跟 URL 走。

---

## 设计 ⑥ — 测试 + E2E

### 单元测试调整

**保留不变**：
- `__tests__/components/self-tracking/self-nutrition-calendar.test.tsx`（cell 视觉变了但 calendar 主行为不变）—— 此 test 用 `aria-label="Day {n}"` 选 cell，新 aria-label 改成 `Day {n}, {kcal} kcal, in progress` 等格式，**测试需要更新选择器**
- `__tests__/components/self-tracking/complete-workout-dialog.test.tsx`（无关）

**新增 2 个 test**：

1. `__tests__/components/self-tracking/nutrition-calendar-popover.test.tsx`
   - 测 trigger 点击 → popover open
   - 点某天 → onSelect 回调 + popover 关闭
   - prev/next month 按钮 work

2. `__tests__/components/self-tracking/self-nutrition-day-view.test.tsx`
   - 测 Mark day complete 按钮：未 completed 状态点击 → fetch PUT 调用包含 `dayCompleted: true`
   - 测已 completed 状态：按钮 disabled，文字显示 "Day completed ✓"

### E2E 调整

- `e2e/self-tracking/owner-nutrition-day.spec.ts`：当前不依赖 calendar 路由，但需要：
  - 加一个步骤验证 `Mark day complete` 按钮点击后状态切换
  - 确认 selectors 还能匹配（PageHeader 不再有 `View Calendar →` 文字）
- `e2e/self-tracking/trainer-template-workout.spec.ts`：可能有 `Training Calendar` 文字 selector，要去掉
- `e2e/self-tracking/trainer-freestyle-workout.spec.ts`：完成后会跳 `/calendar` 路由——**该路由已删**。需改成跳回主页（`/trainer/my-training`）

### 验证 checklist

- [ ] 4 个 calendar 路由 → 404
- [ ] Nutrition 主页两个 popover trigger 都能开
- [ ] Training 主页 PageHeader trigger 能开
- [ ] popover 内选某天 → 主页面同步切到那天 + popover 关闭
- [ ] popover prev/next month 切换正确
- [ ] Cell 视觉三态全对（无 log / 有 log 未 complete / 有 log 已 complete）
- [ ] 今天的 ring 高亮在所有三态上叠加正确
- [ ] DayCompleteBar 状态切换：未 complete → 实色按钮、已 complete → disabled "Day completed ✓"
- [ ] meal-level ✓Completed 仍工作（与 day complete 独立）
- [ ] mobile 窄屏 popover 正常显示
- [ ] member 访问 `/owner/my-nutrition` 等路径仍 redirect（auth guard 不变）
- [ ] `?date=YYYY-MM-DD` URL query 正确同步 day view

---

## 实现拆分（写 implementation plan 时参考）

1. **Stage 1**：calendar 组件 cell 视觉升级（`SelfNutritionCalendar`、`SelfWorkoutCalendar`），更新对应单元测试
2. **Stage 2**：`NutritionCalendarPopover` 和 `WorkoutCalendarPopover` 新组件 + 测试
3. **Stage 3**：`SelfNutritionDayView` 重构（去掉对 `?date=` query 的依赖之前先用本地 state，sticky bar，date字 trigger）
4. **Stage 4**：URL query (`?date=`) 集成到 day view + popover
5. **Stage 5**：`PageHeader` trigger client component（4 个 page 同步改）
6. **Stage 6**：删除 4 个 calendar 路由 + 2 个 client 文件
7. **Stage 7**：E2E spec 更新（freestyle redirect、删 calendar 文字 selectors、加 Mark day complete 验证）
8. **Stage 8**：full smoke (test + lint + build) + commit

每个 stage 跑 `pnpm test` + `pnpm lint`。
