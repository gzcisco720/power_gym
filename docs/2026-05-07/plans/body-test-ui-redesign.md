# Body Test UI 改版设计

**日期**: 2026-05-07
**状态**: Approved
**范围**: Owner + Trainer 体测页面（Member 页面延后单独处理）

---

## 背景

现有 `BodyTestClient` 把录入表单和历史列表混在一个页面，没有遵循项目的 "Forms in Dialogs/Sheets only" 规范，视觉风格也与 Training Templates / Nutrition Templates 页面不统一。本次改版对齐这两个页面的设计语言，并把录入表单移入弹窗。

---

## 页面结构

```
PageHeader
  标题: "Body Tests"
  副标题: "N records"
  右侧: [+ New Test] 按钮 → 打开录入 Dialog

Summary Strip（仅当有记录时显示）
  4 格统计条：
  Latest Weight | Latest Body Fat % | Latest Lean Mass | Body Fat Change (▲▼ vs 上一条)

卡片网格
  grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
  空状态: <EmptyState> + [+ New Test] 按钮
```

---

## 卡片设计

与 Training / Nutrition Templates 卡片保持一致：

- `rounded-xl border border-[#141414] border-t-2 {accent} bg-[#0c0c0c] p-4`
- Accent 颜色：按 `_id` hash 随机选取（rose / violet / sky / amber / emerald）
- **主标题**：日期（如 `May 6, 2025`），`text-sm font-semibold`
- **Protocol chip**：`7-Site · Jackson-Pollock`，小圆角 chip 样式
- **底部四格统计**（border-t 分隔）：Weight / Body Fat % / Lean / Fat，颜色编码
  - Weight → `text-foreground`
  - Body Fat % → rose
  - Lean Mass → sky
  - Fat Mass → amber
- **右上角删除按钮**：`absolute top-2 right-2`，点击弹出确认 Dialog（shadcn Dialog，Cancel + Delete 按钮）

---

## New Test 弹窗（两步向导）

### Step 1 — Basic Info

| 字段 | 类型 | 说明 |
|------|------|------|
| Test Date | date input | 默认今天 |
| Protocol | select | 3-Site / 7-Site / 9-Site / Other |
| Age | number input | 整数，years |
| Sex | radio（Male / Female） | |
| Weight (kg) | number input | step=0.1 |
| Goals（可选，默认折叠） | | |
| └ Target Weight | number input | optional |
| └ Target Body Fat % | number input | optional |

底部：`[Cancel]` `[Next →]`

### Step 2 — Measurements

- Protocol 和 Sex 从 Step 1 状态传入，Step 2 不重复展示
- 根据 Protocol × Sex 动态渲染测量点输入框：
  - 3-site male：chest / abdominal / thigh（3 列）
  - 3-site female：tricep / suprailiac / thigh（3 列）
  - 7-site：chest / midaxillary / tricep / subscapular / abdominal / suprailiac / thigh（3 列）
  - 9-site：tricep / chest / subscapular / abdominal / suprailiac / thigh / midaxillary / bicep / lumbar（3 列）
  - other：单个 Body Fat % 输入框
- 9-site Parrillo 无需年龄/性别参与公式，Step 1 中仍可填写但不影响计算

**实时计算结果区（固定高度，不随内容变化撑开弹窗）**：

```
┌─────────────────────────────────────────┐
│ ● Calculated Result                     │
│                                         │
│   14.2%        67.3 kg      11.2 kg     │
│  Body Fat     Lean Mass    Fat Mass      │
└─────────────────────────────────────────┘
```

- 所有必填测量点都有值时：显示计算数字（实时更新，每次 input 触发）
- 任一必填点为空时：显示 `—`
- 不显示"还需填写 N 个测量点"类型的辅助提示文字

底部：`[← Back]` `[Save]`（Save 在所有测量点有值之前 disabled）

---

## 组件改动

| 文件 | 改动 |
|------|------|
| `body-test-client.tsx` | 完全重写：改为列表 + Summary Strip + 卡片网格，无内联表单 |
| `new-body-test-dialog.tsx`（新建） | 两步向导 Dialog，包含实时计算逻辑 |
| `owner/my-body-tests/page.tsx` | 已更新过，继续使用 BodyTestClient |
| `trainer/members/[id]/body-tests/page.tsx` | 不需要改，已使用 BodyTestClient |

公式计算逻辑（`src/lib/body-test/formulas.ts`）不改，直接在前端 import 用于实时预览。服务端仍做一次计算并快照到数据库，以防前端结果不一致。

---

## 删除确认

不使用 `confirm()`，使用 shadcn `<Dialog>`：

```
Body Test — May 6, 2025
Are you sure you want to delete this record? This action cannot be undone.

[Cancel]  [Delete]
```

---

## 参考实现

- 卡片网格：`plan-template-list.tsx`、`nutrition-template-list.tsx`
- 两步表单状态管理：参考 `food-form.tsx` 的 dirty detection 模式
- Delete 确认 Dialog：参考项目内现有 Dialog 用法
