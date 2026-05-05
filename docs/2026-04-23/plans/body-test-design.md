# 体测功能设计 — POWER_GYM

**日期**: 2026-04-23  
**状态**: 待审核

---

## 概述

训练师为名下会员录入皮褶体测数据，系统根据 Jackson-Pollock 等公式自动计算体脂率、瘦体重、脂肪量并快照至记录。会员只读查看历史记录和趋势图表。

---

## 架构

**模式：** 每次体测为独立 `BodyTest` 文档，不依赖模板或分配流程。公式计算为纯函数，在服务端执行并将结果快照至文档，前端无需重算。历史趋势使用 Recharts 折线图展示。

---

## 数据模型

### BodyTest

```ts
{
  _id: ObjectId,
  memberId: ObjectId,
  trainerId: ObjectId,
  date: Date,

  // 被测信息（公式输入）
  age: number,                    // 测试时年龄（岁）
  sex: 'male' | 'female',
  weight: number,                 // kg

  // 协议
  protocol: '3site' | '7site' | '9site' | 'other',

  // 皮褶厚度 (mm)，未使用字段为 null
  tricep: number | null,
  chest: number | null,
  subscapular: number | null,
  abdominal: number | null,
  suprailiac: number | null,
  thigh: number | null,
  midaxillary: number | null,
  bicep: number | null,
  lumbar: number | null,

  // 计算快照
  bodyFatPct: number,             // %
  leanMassKg: number,             // kg
  fatMassKg: number,              // kg

  // 目标（测试时由训练师设置，可选）
  targetWeight: number | null,    // kg
  targetBodyFatPct: number | null, // %

  createdAt: Date,
}
```

索引：`{ memberId: 1, date: -1 }`（历史查询按时间降序）

---

## 公式层

**文件：** `src/lib/body-test/formulas.ts`

### 3 点协议 — Jackson-Pollock

**男性**（胸部 chest、腹部 abdominal、大腿 thigh）：
```
sum3 = chest + abdominal + thigh
density = 1.10938 - 0.0008267*sum3 + 0.0000016*sum3² - 0.0002574*age
BF% = (495 / density) - 450
```

**女性**（三头肌 tricep、髂骨上 suprailiac、大腿 thigh）：
```
sum3 = tricep + suprailiac + thigh
density = 1.0994921 - 0.0009929*sum3 + 0.0000023*sum3² - 0.0001392*age
BF% = (495 / density) - 450
```

### 7 点协议 — Jackson-Pollock

**男性**（胸部、腋中线、三头肌、肩胛下、腹部、髂骨上、大腿）：
```
sum7 = chest + midaxillary + tricep + subscapular + abdominal + suprailiac + thigh
density = 1.112 - 0.00043499*sum7 + 0.00000055*sum7² - 0.00028826*age
BF% = (495 / density) - 450
```

**女性**（同 7 个点）：
```
density = 1.097 - 0.00046971*sum7 + 0.00000056*sum7² - 0.00012828*age
BF% = (495 / density) - 450
```

### 9 点协议 — Parrillo

所有 9 个点（tricep、chest、subscapular、abdominal、suprailiac、thigh、midaxillary、bicep、lumbar）：
```
sum9 = 全部9点之和
BF% = sum9 * 0.1051 + 2.585
```
（Parrillo 公式不区分性别）

### other 协议

直接录入 `bodyFatPct`，跳过所有皮褶字段。

### 通用派生计算

```
fatMassKg = weight * (bodyFatPct / 100)
leanMassKg = weight - fatMassKg
```

---

## API 路由

| 路由 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/members/[memberId]/body-tests` | GET | 本人 / trainer / owner | 获取会员所有体测记录（按日期降序） |
| `/api/members/[memberId]/body-tests` | POST | trainer / owner | 录入新体测，服务端计算快照 |
| `/api/members/[memberId]/body-tests/[testId]` | DELETE | trainer / owner | 删除单条记录 |

**权限细则：**
- `member`：GET 只能查自己（`session.user.id === memberId`），不能 POST/DELETE
- `trainer`：只能操作自己名下会员（`member.trainerId === trainer._id`）
- `owner`：无限制

---

## UI 页面

### 训练师端

| 页面 | 路径 | 组件类型 | 说明 |
|------|------|----------|------|
| 学员体测管理 | `/dashboard/trainer/members/[id]/body-tests` | Server + Client | 历史记录列表 + 新建体测表单 |

**表单交互：** 选择协议 → 动态展示对应测量点输入框 → 提交后服务端计算结果 → 页面刷新显示新记录

### 会员端

| 页面 | 路径 | 组件类型 | 说明 |
|------|------|----------|------|
| 我的体测记录 | `/dashboard/member/body-tests` | Server + Client | 历史卡片列表 + Recharts 折线图 |

**图表内容：** X 轴为日期，Y 轴显示体重（kg）和体脂率（%）的折线，双 Y 轴。每条记录卡片显示：体重、体脂率、瘦体重、脂肪量，以及与目标的差距（如有）。

---

## 文件结构

### lib 层

| 文件 | 职责 |
|------|------|
| `src/lib/body-test/formulas.ts` | 纯函数：calculateBodyFat, calculateComposition |
| `src/lib/db/models/body-test.model.ts` | BodyTest schema + IBodyTest |
| `src/lib/repositories/body-test.repository.ts` | IBodyTestRepository + MongoBodyTestRepository |

### API 路由

| 文件 | 职责 |
|------|------|
| `src/app/api/members/[memberId]/body-tests/route.ts` | GET + POST |
| `src/app/api/members/[memberId]/body-tests/[testId]/route.ts` | DELETE |

### UI 页面与组件

| 文件 | 职责 |
|------|------|
| `src/app/(dashboard)/trainer/members/[id]/body-tests/page.tsx` | 训练师端（Server） |
| `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx` | 表单 + 列表（Client） |
| `src/app/(dashboard)/member/body-tests/page.tsx` | 会员端（Server） |
| `src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx` | 卡片列表 + Recharts 图表（Client） |

### 测试文件

| 文件 | 测试内容 |
|------|----------|
| `__tests__/lib/body-test/formulas.test.ts` | 各协议公式边界条件 |
| `__tests__/lib/repositories/body-test.repository.test.ts` | MongoBodyTestRepository |
| `__tests__/app/api/members-body-tests.test.ts` | GET + POST /api/members/[memberId]/body-tests |
| `__tests__/app/api/members-body-tests-id.test.ts` | DELETE /api/members/[memberId]/body-tests/[testId] |
| `__tests__/app/trainer/body-test-client.test.tsx` | BodyTestClient（表单 + 列表） |
| `__tests__/app/member/body-test-viewer.test.tsx` | BodyTestViewer（卡片 + 图表） |

---

## 依赖

需安装 Recharts：
```bash
pnpm add recharts
```
