# Member Hub 页面设计文档

## 目标

为 trainer 和 owner 提供一个统一的"成员中心"页面（per-member hub），将现有的 Plan、Body Tests、Nutrition、Progress 四个子功能整合到一个带 tab 导航的页面中，同时在 Overview tab 展示成员关键指标的数据卡片。

---

## 路由结构

```
/trainer/members/[id]              ← 新增，Overview tab（默认入口）
/trainer/members/[id]/plan         ← 已有（保持不变）
/trainer/members/[id]/body-tests   ← 已有（保持不变）
/trainer/members/[id]/nutrition    ← 已有（保持不变）
/trainer/members/[id]/progress     ← 已有（保持不变）
```

Owner 复用 trainer 路由。Owner 成员列表添加 `View →` 链接指向 `/trainer/members/[id]`，不新建 `/owner/members/[id]/*` 路由。

---

## 架构

### Layout（共享层）

**文件：** `src/app/(dashboard)/trainer/members/[id]/layout.tsx`

- Server component
- 职责：
  1. 权限校验（统一，替代各子页面的重复校验）
  2. 从 DB fetch 成员基本信息（name、email、createdAt）
  3. 从 `session.user.role` 读取当前用户角色
  4. 渲染 Profile 头部（将 `role` 作为 prop 传入，用于控制 Reassign 按钮可见性）
  5. 渲染 `<MemberTabNav>`（client component，传入 `memberId`）
  6. 渲染 `{children}`
- 权限规则：
  - 未登录 → `redirect('/login')`
  - trainer 且成员不属于自己 → `redirect('/trainer/members')`
  - owner → 允许访问任何成员

### Profile 头部

固定在所有 tab 顶部，内容：

| 元素 | 数据来源 | 备注 |
|------|----------|------|
| 头像缩写圆圈 | `member.name` 首字母 | 无需上传照片 |
| 成员姓名 | `member.name` | |
| 邮箱 | `member.email` | |
| 加入时长 | `member.createdAt` | 如"已加入 23 天" |
| Reassign 按钮 | — | 仅 owner 可见，复用现有 ReassignModal |

### Tab 导航

**文件：** `src/components/shared/member-tab-nav.tsx`

- Client component（需要 `usePathname` 检测 active tab）
- Tab 列表：

| Tab | 路由 |
|-----|------|
| Overview | `/trainer/members/[id]` |
| Plan | `/trainer/members/[id]/plan` |
| Body Tests | `/trainer/members/[id]/body-tests` |
| Nutrition | `/trainer/members/[id]/nutrition` |
| Progress | `/trainer/members/[id]/progress` |

- Active 判断：`pathname === href` 或 `pathname.startsWith(href + '/')` —— Overview tab 只用 `===`，避免所有子路由都高亮 Overview

---

## Overview Tab

**文件：** `src/app/(dashboard)/trainer/members/[id]/page.tsx`

Server component，并行 fetch 三个数据源，渲染 5 张数据卡片。

### 数据卡片

| 卡片 | 数据来源 | 无数据显示 |
|------|----------|-----------|
| 当前体重 | 最新体测 `.weight` | `—` |
| 体脂率 | 最新体测 `.bodyFatPercent` | `—` |
| 累计训练次数 | `findMemberStats().completedCount` | `0` |
| 上次训练 | `findMemberStats().lastCompletedAt` | `—` |
| 当前计划 | active plan `.templateName` | `无计划` |

卡片布局：桌面端横向 5 列；移动端 2 列换行。

### 数据 fetch

```typescript
const [bodyTest, stats, activePlan] = await Promise.all([
  new MongoBodyTestRepository().findLatestByMember(memberId),
  new MongoWorkoutSessionRepository().findMemberStats(memberId),
  new MongoMemberPlanRepository().findActive(memberId),
]);
```

---

## 新增 Repository 方法

### `IWorkoutSessionRepository`

```typescript
findMemberStats(memberId: string): Promise<{
  completedCount: number;
  lastCompletedAt: Date | null;
}>;
```

MongoDB 实现：单次 aggregation，`$match` 已完成的 sessions，`$group` 计算 count 和 max(completedAt)。

---

## 成员列表改动

### Trainer `/trainer/members`

- 每张卡片整体变为 `<Link href="/trainer/members/[id]">`
- 移除现有的 4 个深链接（Plan →、Body Tests →、Nutrition →、Progress →）
- 卡片只保留：姓名 + 邮箱

### Owner `/owner/members`

- 每行新增 `View →` 链接，指向 `/trainer/members/[id]`
- 现有 Reassign 按钮保持不变

---

## 现有子页面

Plan、Body Tests、Nutrition、Progress 页面文件本身不修改内容逻辑，但：

- 各自的 auth check 保留（作为第二道防线）
- 页面内部的 `<h1>` / `PageHeader` 可移除（标题由 layout 的 Profile 头部承担），但这属于可选的清理工作，不在本次 scope 内

---

## 测试要点

- Layout 权限校验：未登录、trainer 访问他人成员、owner 访问任意成员
- Overview 页：无体测/无 sessions/无计划时各卡片正确显示 fallback
- Tab 导航：各路由对应正确的 active tab，Overview tab 不因子路由误高亮
- `findMemberStats`：有 sessions / 无 sessions 两种情况
- Owner 成员列表 View → 链接正确指向 `/trainer/members/[id]`
