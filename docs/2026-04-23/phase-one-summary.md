# POWER_GYM 第一阶段开发总结

**日期**: 2026-04-23  
**状态**: 完成

---

## 项目概述

POWER_GYM 是一个面向健身房的 Web 管理平台，支持三种用户角色（Owner / Trainer / Member），覆盖训练计划、营养计划、体测记录、训练日志四大核心业务域。

---

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Next.js 16 App Router |
| 语言 | TypeScript（strict，禁止 `any` / `unknown`） |
| 数据库 | MongoDB + Mongoose |
| 认证 | Auth.js v5（Credentials provider，httpOnly cookie） |
| UI | Shadcn/ui + TailwindCSS |
| 图表 | Recharts |
| 测试 | Jest + React Testing Library |
| 包管理 | pnpm |

---

## 角色与权限体系

| 角色 | 权限范围 |
|------|---------|
| Owner | 管理所有 Trainer 和 Member，拥有全部数据读写权限 |
| Trainer | 管理自己名下的 Member，创建并分配训练/营养计划，录入体测 |
| Member | 只读查看自己的计划、营养方案、体测历史；记录训练日志 |

权限在 Next.js Middleware 层前置拦截，API 路由内再做二次校验（Trainer 只能操作自己名下的 Member）。

---

## 已完成功能模块

### 1. 认证系统

- 首位注册用户自动成为 Owner，后续用户须通过邀请链接注册
- 邀请 token 签名存储于 MongoDB，含角色、邀请人、过期时间
- Session 存储在 MongoDB，通过 httpOnly cookie 传递
- 三角色中间件守卫所有 `/dashboard` 路由

**设计文档**: [auth-design.md](../2026-04-20/plans/auth-design.md)  
**实施计划**: [auth-implementation-plan.md](../2026-04-20/plans/auth-implementation-plan.md)

---

### 2. 训练计划 & 表现追踪

**Trainer 端：**
- 创建多日训练模板（每日含多个动作，设定组数 × 次数范围）
- 将模板深拷贝为会员专属计划并分配

**Member 端：**
- 查看当日训练，按组记录实际重量 / 次数并打勾完成
- 新建训练日志（关联计划日或自由训练）
- 个人最佳（PB）看板：Epley 公式计算预估 1RM，展示每个动作的历史最佳

**设计文档**: [training-plans-design.md](../2026-04-21/plans/training-plans-design.md)  
**实施计划**: [training-plans-implementation-plan.md](../2026-04-21/plans/training-plans-implementation-plan.md)

---

### 3. 营养计划

**Trainer 端：**
- 创建可复用营养模板，支持多种天类型（训练日 / 休息日 / 高碳日等）
- 每种天类型设定宏量目标（蛋白质 / 碳水 / 脂肪 / 千卡）
- 每餐内通过食物搜索框添加食物条目，系统按克数自动换算并快照宏量
- 食物库：全局内置 + Trainer 自建，支持 per100g 和 perServing 两种规格
- 将模板深拷贝为会员专属计划分配

**Member 端：**
- Tab 切换天类型，查看宏量目标和分餐食物清单

**设计文档**: [nutrition-design.md](../2026-04-22/plans/nutrition-design.md)  
**实施计划**: [nutrition-implementation-plan.md](../2026-04-22/plans/nutrition-implementation-plan.md)

---

### 4. 体测记录

**Trainer 端：**
- 为名下会员录入皮褶体测数据，支持四种协议：
  - **3 点法 Jackson-Pollock**（男性：胸/腹/大腿；女性：三头肌/髂骨上/大腿）
  - **7 点法 Jackson-Pollock**（男女各有独立系数）
  - **9 点法 Parrillo**（全部 9 个点，不区分性别）
  - **直接输入**（跳过皮褶，手动录入体脂率）
- 服务端计算体脂率（Siri 公式：BF% = 495/density − 450）、脂肪量、瘦体重并快照至文档
- 可选设定目标体重 / 目标体脂率

**Member 端：**
- 历史记录卡片：展示体重、体脂率、瘦体重、脂肪量及与目标的差距
- Recharts 双 Y 轴折线图：体重（左轴/kg）+ 体脂率（右轴/%）历史趋势

**设计文档**: [body-test-design.md](plans/body-test-design.md)  
**实施计划**: [body-test-implementation-plan.md](plans/body-test-implementation-plan.md)

---

## 架构决策

### Repository Pattern
所有数据库访问通过接口（`IXxxRepository`）隔离，MongoDB 实现与业务逻辑分离。测试中只需 mock 接口，不依赖真实数据库连接。

### 快照存储
计划分配、营养条目宏量、体测计算结果均在写入时固化。读取无需重算，也不随原始模板变更而改变。

### 服务端计算
体测公式和营养宏量换算均在 Route Handler 内执行，前端只传原始输入，不参与计算。

### TDD 强制执行
项目 CLAUDE.md 中设定强制 Red-Green-Refactor 循环，每个功能先写失败测试再实现。

---

## 测试覆盖

| 指标 | 数值 |
|------|------|
| 总测试数 | **234** |
| 测试套件 | **50** |
| 通过率 | **100%** |
| ESLint | 0 warnings / 0 errors |
| TypeScript | 0 errors |
| 构建 | 成功（22 个静态页面） |

### 测试分层

| 层 | 内容 |
|----|------|
| 纯函数单测 | 体测公式（各协议边界值）、宏量换算 |
| Repository 单测 | 所有 Mongo 仓库（mock Model）|
| API 路由集成测 | 所有 Route Handler（mock auth + repo）|
| UI 组件测 | 所有 Client 组件（React Testing Library）|

---

## 文件产出统计

| 类型 | 数量（约） |
|------|-----------|
| 源码文件（src/） | 60+ |
| 测试文件（\_\_tests\_\_/） | 50 |
| 设计文档 | 4 |
| 实施计划 | 4 |
| Git 提交 | 77 |

---

## 第二阶段展望（待规划）

以下为当前已知的潜在待办方向，尚未立项：

- **E2E 测试**：补充 Playwright 端到端覆盖关键用户流程
- **Owner 管理后台**：Trainer 管理、会员归属调整、全局数据概览
- **数据导出**：体测历史、训练记录导出为 CSV / PDF
- **推送通知**：训练提醒、计划更新通知
- **移动端适配**：当前 UI 基于桌面优先，需做响应式优化
