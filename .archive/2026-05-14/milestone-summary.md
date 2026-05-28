# POWER_GYM — 基础功能里程碑总结

**最初记录**: 2026-05-14 | **最后更新**: 2026-05-25  
**状态**: Living（随功能演进持续更新）  
**里程碑**: 12 大功能域全部落地，平台具备生产就绪基础

---

## 项目概述

POWER_GYM 是面向健身房的全栈 Web 管理平台，支持 Owner / Trainer / Member 三角色，覆盖训练、营养、体测、日程、设备、健康六大业务域。

---

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Next.js App Router |
| 语言 | TypeScript strict（零 `any` / `unknown`） |
| 数据库 | MongoDB + Mongoose |
| 认证 | Auth.js v5（Credentials + httpOnly cookie） |
| UI | Shadcn/ui + TailwindCSS（dark oklch 主题） |
| 图表 | Recharts |
| 单测 | Jest + React Testing Library |
| E2E | Playwright + Mailpit |
| 邮件 | Nodemailer（dev）/ Mailgun（prod）|
| 媒体 | Cloudinary / MinIO（图片上传）|
| 包管理 | pnpm |

---

## 已完成功能域（12 / 12）

### 1. 认证系统

- 首位注册自动成为 Owner；后续用户通过带签名邀请链接注册
- 邀请 token 含角色 + 邀请人 + 过期时间，存储于 MongoDB
- 中间件前置角色守卫所有 `/dashboard` 路由，API 内二次校验
- Forgot Password / Reset Password 完整邮件流程
- User 模型重构：`name` 拆分为 `firstName + lastName`（虚拟 getter 向后兼容）

### 2. 训练计划 & 会员训练日志

- Trainer 创建多日模板（每日多动作，组数 × 次数范围）；深拷贝分配给会员
- Member 按组记录实际重量 / 次数，支持 Session Logger（集合动作、超级组）
- 训练模板编辑器全面重设计：动作缩略图、超级组 "+ Add Superset"、主题 token 迁移
- 训练模板三阶段：Editor / Logging / Read-only Preview
- 完成后 Session 只读，跨日提示，24h cron 自动封存

### 3. 营养计划

- Trainer 创建多天类型模板（训练日 / 休息日 / 高碳日等），设定宏量目标
- 食物库：全局内置 + Trainer 自建（per100g / perServing 规格）
- 深拷贝分配给会员；macros 按克数自动换算并快照
- Member 查看分日类型的宏量目标和分餐清单

### 4. 体测记录

- 4 种体测协议：Jackson-Pollock 3 点法 / 7 点法（男女独立系数）、Parrillo 9 点法、直接输入
- 服务端计算体脂率（Siri 公式）、脂肪量、瘦体重并快照
- 页面重设计：Summary Strip（最新指标）+ 卡片网格 + Dialog 录入表单
- Member 查看历史卡片及 Recharts 双 Y 轴趋势图（体重 + 体脂率）

### 5. 个人最佳（PB）& 表现追踪

- Epley 公式计算预估 1RM
- 每个动作独立 PB 看板
- 训练热力图（近 365 天）
- 1RM 历史趋势图（Recharts 折线）

### 6. 日程 & 会话排期

- Owner / Trainer：Outlook 风格 7 列周历，30 分钟颗粒度
- 支持一对一 / 团体课，颜色区分 Trainer
- 创建 / 编辑 / 取消 session，支持按此创建后续循环
- Member：只读的即将到来课次列表
- 邮件提醒：预约确认、取消通知、24h 前提醒

### 7. 每日打卡 & Check-In

- 可配置打卡频率，Members 按计划打卡
- Trainer 查看打卡历史，Owner 查看全员打卡情况
- 打卡触发邮件确认

### 8. 设备管理

- 设备库存：名称、品牌、数量、图片（MinIO / Cloudinary）
- 状态追踪：Active / Maintenance / Retired
- 条件报告历史
- EditEquipmentDialog：Details 标签（编辑字段）+ Condition 标签（条件报告），统一入口

### 9. 会员健康 & 伤病记录

- 伤病记录（部位、严重程度、状态、备注）
- 健康概览仪表盘
- Trainer 在 Member Hub 内查看

### 10. 用户档案 & 设置

- 所有角色扩展档案：手机、地址、头像、生日
- Trainer 额外：证书、专项领域
- Owner 额外：健身房名称、地址、联系方式
- 设置页三标签：Profile / Security（修改密码）/ Gym Info（Owner 限定）
- 侧边栏 Popover 用户菜单（头像 + 姓名 + 邮箱 + 登出确认）
- 头像上传支持

### 11. 进度图表 & 分析

- 训练热力图（标记有训练记录的日期）
- 按动作的 1RM 趋势折线图（Epley 预估）
- Trainer Member Hub 内嵌进度页
- Member 自主查看 `/member/progress`

### 12. 邮件通知（9 种场景）

| 场景 | 触发时机 |
|------|---------|
| 邀请注册 | Owner / Trainer 发送邀请 |
| 计划分配 | Trainer 为会员分配训练计划 |
| 营养计划分配 | Trainer 为会员分配营养计划 |
| 会员归属变更 | Owner 重新分配会员给其他 Trainer |
| 会话预约确认 | 日程 session 创建 |
| 会话取消通知 | 日程 session 取消 |
| 24h 前提醒 | 距 session 开始 24 小时 |
| 打卡确认 | 会员提交每日打卡 |
| 密码重置 | 忘记密码流程 |

E2E 验证：Mailpit 作为邮件 sink，所有 9 种邮件均有 Playwright 断言验证投递。

---

## Owner / Trainer 自我训练 & 营养追踪

额外的 Personal 功能域（不属于 Member 管理流程）：

- **My Training** — 从模板或 Freestyle 开始自训，支持任意天任意次数自由打卡
- **My Nutrition** — 自录每日饮食，Day Complete 确认弹窗，Calendar Popover 查看月历
- 自训不受"每天一次"限制（同一天可多次）；但每天只允许一个"已完成"session
- 训练结束弹窗：可选保存为可复用模板

---

## 平台 UX 标准

| 方面 | 现状 |
|------|------|
| 移动端适配 | Session Logger 使用底部 Sheet，所有页面 < sm 布局调整 |
| 设计系统 | oklch 暗色主题，Space Grotesk，统一 token（零 hardcoded hex）|
| 加载状态 | 全平台 Skeleton loading，所有异步操作有 spinner / 禁用态 |
| 表单规范 | Dirty detection + beforeunload + sticky action bar |
| 无障碍 | WCAG AA 对比度，所有 icon-only 按钮有 aria-label |
| 错误处理 | Toast 反馈（sonner），Dialog 确认（删除/登出/Day Complete）|

---

## 质量指标

| 指标 | Phase 1（2026-04-23）| 里程碑（2026-05-14）| 当前（2026-05-25）|
|------|----------------------|---------------------|-------------------|
| Jest 测试数 | 234 | 1,227 | **1,622** |
| Jest 测试套件 | 50 | 199 | **260** |
| E2E spec 文件 | 0 | 42 | **57** |
| 通过率 | 100% | 100% | **100%** |
| ESLint | 0 错误 / 0 警告 | 0 错误 / 0 警告 | **0 错误 / 0 警告** |
| TypeScript | 0 错误 | 0 错误 | **0 错误** |
| Git 提交总数 | — | 606 | **1,115** |

---

## 架构亮点

- **Repository Pattern**：所有 DB 访问通过接口隔离，测试无需真实数据库
- **快照存储**：宏量换算、体测计算在写入时固化，读取不重算
- **服务端计算**：体测公式、营养换算均在 Route Handler 执行
- **中间件角色守卫 + API 二次校验**：双层权限验证
- **TDD 全程贯穿**：Red-Green-Refactor + `/simplify` Refactor 步骤

---

## 里程碑后完成（2026-05-14 → 2026-05-25）

| 功能 | 说明 |
|------|------|
| Progressive Overload 追踪 | NSCA 2-for-2 规则 + ACSM 5% 增重提示 |
| 数据导出（CSV） | 体测记录 + 训练 session 导出 |
| 设备管理增强 | 维护计划、状态过滤、逾期徽章 |
| 定价 & 计费管理 | 服务类型、计费 session、货币配置 |
| React Doctor 修复 | 689 项代码质量问题全部修复 |
| 代码质量全面提升 | LazyMotion 迁移、Promise.all 并行化、stable key、a11y 修复 |

---

## 当前 Roadmap（剩余未开始项目）

按 roadmap.md 优先级排序：

1. **D — 生产部署** — Vercel + MongoDB Atlas + 环境变量 + 安全审计
2. **G — 推送通知** — Web Push 训练提醒，会员可订阅 / 退订
3. **I — 训练计划推荐** — 基于会员档案（目标、级别、伤病）推荐模板
