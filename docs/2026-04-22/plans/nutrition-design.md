# 营养计划功能设计 — POWER_GYM

**日期**: 2026-04-22
**状态**: 待审核

---

## 概述

训练师创建可复用的营养计划模板，包含多种天类型（如训练日、休息日），每种天类型有独立的宏量目标和完整餐食结构。分配时对模板做深拷贝，生成会员专属计划。会员只查看，不记录实际摄入。

---

## 架构

**模式：** 与训练计划完全一致 — NutritionTemplate（模板）→ 分配时深拷贝 → MemberNutritionPlan（会员计划）。

**食物库：** 独立 `Food` 集合，支持全局内置、训练师手动创建、以及未来外部 API 接入（通过 `source` 和 `externalId` 字段扩展）。添加食物条目时，按克数换算后的宏量值快照至餐食条目中，与食物库解耦。

---

## 数据模型

### Food（食物库）

```ts
{
  _id: ObjectId,
  name: string,
  brand: string | null,
  source: 'manual' | 'api',
  externalId: string | null,      // 外部API的ID，用于去重与同步
  createdBy: ObjectId | null,     // null = 全局内置；trainer ObjectId = 自定义
  isGlobal: boolean,
  per100g: {
    kcal: number;
    protein: number;              // g
    carbs: number;                // g
    fat: number;                  // g
  } | null,
  perServing: {
    servingLabel: string;         // 如"1片"、"1勺"
    grams: number;                // 每份克数
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null,
  createdAt: Date
}
```

约束：`per100g` 和 `perServing` 至少一个不为 null。
索引：`(name, createdBy)`（唯一）— 同名食物允许不同训练师分别创建。

---

### NutritionTemplate（模板）

```ts
{
  _id: ObjectId,
  name: string,
  description: string | null,
  createdBy: ObjectId,
  dayTypes: [
    {
      name: string,               // 如"训练日"、"休息日"、"高碳日"
      targetKcal: number,
      targetProtein: number,      // g
      targetCarbs: number,        // g
      targetFat: number,          // g
      meals: [
        {
          name: string,           // 如"早餐"、"午餐"、"晚餐"、"加餐"
          order: number,          // 排序（升序显示）
          items: [
            {
              foodId: ObjectId,
              foodName: string,   // 快照，不随Food集合变化
              quantityG: number,  // 实际用量（克）
              kcal: number,       // 按quantityG换算后的快照值
              protein: number,
              carbs: number,
              fat: number,
            }
          ]
        }
      ]
    }
  ],
  createdAt: Date
}
```

---

### MemberNutritionPlan（会员计划，深拷贝）

```ts
{
  _id: ObjectId,
  memberId: ObjectId,
  trainerId: ObjectId,
  templateId: ObjectId,           // 来源模板ID（仅记录，不再动态引用）
  name: string,
  isActive: boolean,
  assignedAt: Date,
  dayTypes: [ /* 与 NutritionTemplate.dayTypes 结构完全一致的深拷贝 */ ]
}
```

同一会员同一时间只有一个激活计划（分配新计划前调用 `deactivateAll`）。

---

## 宏量换算工具

纯函数，用于在添加食物条目时计算宏量快照：

```ts
// src/lib/nutrition/macros.ts
function calculateMacros(food: Food, quantityG: number): MacroSnapshot {
  // 优先用 per100g，否则用 perServing 折算
}
```

---

## API 路由

| 路由 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/foods` | GET | 所有登录用户 | 返回全局食物 + 当前trainer自建食物（member使用trainerId查询） |
| `/api/foods` | POST | trainer / owner | 创建自定义食物 |
| `/api/nutrition-templates` | GET | trainer / owner | 获取当前用户创建的所有模板 |
| `/api/nutrition-templates` | POST | trainer / owner | 创建模板 |
| `/api/nutrition-templates/[id]` | GET | trainer / owner | 获取单个模板（仅限创建者或owner） |
| `/api/nutrition-templates/[id]` | PUT | trainer / owner | 更新模板（仅限创建者或owner） |
| `/api/nutrition-templates/[id]` | DELETE | trainer / owner | 删除模板（仅限创建者或owner） |
| `/api/members/[memberId]/nutrition` | GET | 本人 / trainer / owner | 获取会员激活营养计划 |
| `/api/members/[memberId]/nutrition` | POST | trainer / owner | 分配模板给会员（深拷贝，先deactivateAll） |

**权限细则：**
- `member`：GET 只能查自己，不能 POST
- `trainer`：只能分配给自己名下会员（`member.trainerId === trainer._id`）
- `owner`：可操作所有

---

## UI 页面

### 训练师端

| 页面 | 路径 | 组件类型 | 说明 |
|------|------|----------|------|
| 模板列表 | `/dashboard/trainer/nutrition` | Server | 显示所有模板，含新建/删除入口 |
| 新建模板 | `/dashboard/trainer/nutrition/new` | Client | 多天类型 + 餐食 + 食物搜索与添加 |
| 编辑模板 | `/dashboard/trainer/nutrition/[id]/edit` | Client | 预填现有数据 |
| 学员营养管理 | `/dashboard/trainer/members/[id]/nutrition` | Client | 查看当前计划，选择模板分配 |

### 会员端

| 页面 | 路径 | 组件类型 | 说明 |
|------|------|----------|------|
| 营养计划 | `/dashboard/member/nutrition` | Server + Client | 按天类型切换，展示宏量目标和完整餐食 |

**核心交互：**
- 新建/编辑模板：支持添加多个天类型，每个天类型下添加多个餐食，每个餐食内通过搜索框查找食物并填写克数，系统自动换算宏量
- 会员页：Tab 切换天类型，每个天类型显示宏量目标（蛋白质/碳水/脂肪/总千卡）和分餐食物清单

---

## 文件结构

### lib 层

| 文件 | 职责 |
|------|------|
| `src/lib/nutrition/macros.ts` | `calculateMacros` 纯函数 |
| `src/lib/db/models/food.model.ts` | Food schema + IFood |
| `src/lib/db/models/nutrition-template.model.ts` | NutritionTemplate schema |
| `src/lib/db/models/member-nutrition-plan.model.ts` | MemberNutritionPlan schema |
| `src/lib/repositories/food.repository.ts` | IFoodRepository + MongoFoodRepository |
| `src/lib/repositories/nutrition-template.repository.ts` | INutritionTemplateRepository + Mongo impl |
| `src/lib/repositories/member-nutrition-plan.repository.ts` | IMemberNutritionPlanRepository + Mongo impl |

### API 路由

| 文件 | 职责 |
|------|------|
| `src/app/api/foods/route.ts` | GET + POST /api/foods |
| `src/app/api/nutrition-templates/route.ts` | GET + POST /api/nutrition-templates |
| `src/app/api/nutrition-templates/[id]/route.ts` | GET + PUT + DELETE |
| `src/app/api/members/[memberId]/nutrition/route.ts` | GET + POST |

### UI 页面与组件

| 文件 | 职责 |
|------|------|
| `src/app/(dashboard)/trainer/nutrition/page.tsx` | 模板列表（Server） |
| `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx` | 列表Client组件 |
| `src/app/(dashboard)/trainer/nutrition/new/page.tsx` | 新建模板（Client） |
| `src/app/(dashboard)/trainer/nutrition/[id]/edit/page.tsx` | 编辑模板（Client） |
| `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx` | 表单核心Client组件 |
| `src/app/(dashboard)/trainer/members/[id]/nutrition/page.tsx` | 学员营养管理（Server） |
| `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx` | 分配操作Client组件 |
| `src/app/(dashboard)/member/nutrition/page.tsx` | 会员营养计划（Server） |
| `src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx` | 天类型切换与展示Client组件 |

### 测试文件

| 文件 | 测试内容 |
|------|----------|
| `__tests__/lib/nutrition/macros.test.ts` | calculateMacros 边界条件 |
| `__tests__/lib/repositories/food.repository.test.ts` | MongoFoodRepository |
| `__tests__/lib/repositories/nutrition-template.repository.test.ts` | MongoPlanTemplateRepository |
| `__tests__/lib/repositories/member-nutrition-plan.repository.test.ts` | MongoMemberNutritionPlanRepository |
| `__tests__/app/api/foods.test.ts` | /api/foods |
| `__tests__/app/api/nutrition-templates.test.ts` | /api/nutrition-templates |
| `__tests__/app/api/nutrition-templates-id.test.ts` | /api/nutrition-templates/[id] |
| `__tests__/app/api/members-nutrition.test.ts` | /api/members/[memberId]/nutrition |
| `__tests__/app/trainer/nutrition-template-form.test.tsx` | NutritionTemplateForm |
| `__tests__/app/trainer/nutrition-template-list.test.tsx` | NutritionTemplateList |
| `__tests__/app/trainer/trainer-member-nutrition.test.tsx` | TrainerMemberNutritionClient |
| `__tests__/app/member/nutrition-plan-viewer.test.tsx` | NutritionPlanViewer |
