# gstack Skills 参考手册

> gstack 是 Garry Tan（YC CEO）开源的 Claude Code 工具集，将 Claude 变成一支虚拟工程团队。
> 安装路径：`~/.claude/skills/gstack` · 升级：`/gstack-upgrade`

---

## 目录

1. [产品策略类](#1-产品策略类)
2. [代码审查 & 发布类](#2-代码审查--发布类)
3. [QA & 浏览器类](#3-qa--浏览器类)
4. [设计类](#4-设计类)
5. [安全类](#5-安全类)
6. [文档类](#6-文档类)
7. [调试 & 分析类](#7-调试--分析类)
8. [iOS 专项](#8-ios-专项)
9. [工具 & 配置类](#9-工具--配置类)
10. [推荐工作流组合](#10-推荐工作流组合)

---

## 1. 产品策略类

### `/office-hours`
**用途：** 产品思维导师。描述你在构建什么，它用 6 个追问挑战你的假设，帮你找到真正要解决的问题。

```
你:    /office-hours
       我想给 power_gym 加一个聊天功能
Claude: [追问] trainer 和 member 之间？还是群组？
        [挑战] 你描述的不是"聊天"，而是"教练通知系统"
        [给出 3 个实现方案，带工作量估算]
```

---

### `/plan-ceo-review`
**用途：** 从 CEO 视角做 10 项计划审查——商业价值、范围控制、风险。

```
你: /plan-ceo-review   # 需要先有设计文档
```

---

### `/plan-eng-review`
**用途：** 工程主管视角审查——架构合理性、技术债、扩展性风险。

---

### `/plan-design-review`
**用途：** 设计总监视角审查——UX 流程、信息架构、交互状态覆盖、AI 低质量设计检测，并生成视觉原型。

---

### `/plan-devex-review`
**用途：** 开发者体验（DX）视角审查——上手时间（TTHW）、API 可用性、文档质量。

---

### `/autoplan`
**用途：** 描述一个功能，自动生成完整的分阶段实现计划（含成功标准和 TDD 测试用例）。

```
你: /autoplan 给 member 加一个身体成分历史趋势图
Claude: [生成 Stage 1-4 计划，每阶段含测试用例和验证标准]
```

---

## 2. 代码审查 & 发布类

### `/review`
**用途：** 完整 PR 审查——逐文件检查 bug、安全问题、逻辑错误。

```
你: /review
Claude: [审查当前 branch 所有改动，标出问题行号和原因]
```

---

### `/ship`
**用途：** 端到端发布流程——审查 → 测试 → lint → build → commit → PR，一条龙。

```
你: /ship
```

---

### `/land-and-deploy`
**用途：** PR 合并后的部署流程自动化。

---

### `/canary`
**用途：** 发布前最后安全检查清单（金丝雀发布）。

---

### `/careful`
**用途：** 谨慎模式。激活后每步操作都会请求确认，适合高风险改动。

---

## 3. QA & 浏览器类

### `/qa`
**用途：** 全流程 QA 测试——打开真实浏览器，走完完整用户流程，截图记录 bug。

```
你: /qa http://localhost:3000
Claude: [打开浏览器，走完登录 → 训练计划 → 记录 session 的完整流程]
        [发现：手机端导航栏遮挡提交按钮，截图附上]
```

---

### `/qa-only`
**用途：** 纯浏览器 QA 测试，不看代码，不做代码审查。

---

### `/browse`
**用途：** 通用网页浏览——让 Claude 打开任意 URL，交互操作，截图，提取内容。

```
你: /browse https://localhost:3000/trainer/members
    帮我看看这个页面在移动端有没有布局问题
```

---

### `/connect-chrome`
**用途：** 连接你正在用的真实 Chrome，不用 headless 模式。

---

### `/setup-browser-cookies`
**用途：** 把浏览器的登录 cookie 同步给 gstack，免得每次重新登录。

---

### `/scrape`
**用途：** 提取网页数据——抓取页面内容、表格、列表等结构化数据。

---

### `/open-gstack-browser`
**用途：** 打开 gstack 内置浏览器窗口。

---

## 4. 设计类

### `/design-consultation`
**用途：** 设计咨询——描述 UI 问题，获得设计建议和改进方向。

```
你: /design-consultation
    我的训练计划页面信息太密集，用户反映看不懂
Claude: [分析信息层级，给出重新组织的建议]
```

---

### `/design-review`
**用途：** 视觉设计审查——截图你的界面，指出视觉问题、可访问性问题、设计规范违反。

---

### `/design-html`
**用途：** 直接生成高质量 HTML 设计稿（原型）。

---

### `/design-shotgun`
**用途：** 散弹式设计探索——同时生成多个设计方向，快速比较。

---

## 5. 安全类

### `/cso`
**用途：** 安全审查——OWASP Top 10 + STRIDE 威胁建模，找越权、注入、XSS 等漏洞。

```
你: /cso
Claude: [检查 auth、SQL 注入、XSS、权限提升等]
        [发现：/api/trainer/members 未验证 trainerId 归属，存在越权风险]
```

---

### `/guard`
**用途：** 保护关键文件——标记某些文件为"受保护"，防止 Claude 意外修改。

---

### `/freeze` / `/unfreeze`
**用途：** 冻结/解冻代码——临时锁定特定文件（如上线前锁定 auth 逻辑）。

---

## 6. 文档类

### `/document-release`
**用途：** 读取 git log，自动生成 CHANGELOG / Release Notes。

```
你: /document-release
Claude: [生成本次发布的功能清单、bug 修复、breaking changes]
```

---

### `/document-generate`
**用途：** 为代码、API、模块自动生成技术文档。

---

### `/landing-report`
**用途：** 功能上线后生成用户可见的变更报告。

---

## 7. 调试 & 分析类

### `/investigate`
**用途：** 系统调查——给出 bug 或奇怪现象，用根因分析方法逐步排查。

```
你: /investigate
    member 页面偶尔 500，只在周一早上发生
Claude: [逐步排查：cron job → DB 连接池 → 日志模式分析]
```

---

### `/retro`
**用途：** 工程复盘——分析 git 活动、bug 模式、改进点。

---

### `/benchmark` / `/benchmark-models`
**用途：** 性能基准测试——测试代码或 API 性能，对比不同实现方案。

---

### `/health`
**用途：** 项目健康检查——测试覆盖率、lint、依赖安全、构建状态快速扫描。

---

### `/canary`
**用途：** 发布前安全检查清单，也用于金丝雀发布监控。

---

## 8. iOS 专项

| Skill | 用途 |
|---|---|
| `/ios-qa` | iOS 应用 QA 测试 |
| `/ios-fix` | iOS bug 修复辅助 |
| `/ios-clean` | iOS 项目清理 |
| `/ios-sync` | iOS 项目同步 |
| `/ios-design-review` | iOS 界面设计审查 |

> 这组 skills 针对 iOS 项目，power_gym 暂不适用。

---

## 9. 工具 & 配置类

### `/context-save` / `/context-restore`
**用途：** 保存当前对话状态，下次会话恢复继续工作（跨会话连续性）。

---

### `/learn`
**用途：** 查看 gstack 跨会话积累的项目知识，剪枝过期条目。

```
你: /learn
Claude: [显示 gstack 记住的项目规律，如"weekly cron 触发了 500 错误"]
```

---

### `/gstack-upgrade`
**用途：** 升级 gstack 到最新版本。

```
你: /gstack-upgrade
```

---

### `/skillify`
**用途：** 把你的常用操作序列封装成可复用的自定义 skill。

---

### `/pair-agent`
**用途：** 把远程 AI agent 与你的浏览器配对，让另一个 agent 获得浏览器访问权。

---

### `/make-pdf`
**用途：** 把网页或 HTML 文件导出为 PDF。

---

### `/sync-gbrain` / `/setup-gbrain`
**用途：** 配置和同步 GBrain（跨机器的语义代码搜索索引）。

---

## 10. 推荐工作流组合

针对 **power_gym**（Next.js 全栈项目）的实用组合：

### 新功能开发
```
/office-hours     # 1. 澄清需求，挑战假设
/autoplan         # 2. 生成分阶段实现计划
[实现代码]         # 3. TDD 开发
/review           # 4. 代码审查
/qa localhost:3000 # 5. 真实浏览器测试
/ship             # 6. 一键发布
```

### 修 Bug
```
/investigate      # 1. 根因分析
[修复代码]         # 2. 修复
/qa localhost:3000 # 3. 验证
/ship             # 4. 发布
```

### 上线前检查
```
/cso              # 安全审查
/qa localhost:3000 # 功能验证
/canary           # 发布前清单
/ship             # 发布
```

### 设计问题
```
/design-consultation  # 1. 设计咨询
[修改 UI]             # 2. 实现
/design-review        # 3. 视觉审查
/qa localhost:3000    # 4. 浏览器验证
```

### 上线后
```
/document-release  # 生成 Release Notes
/landing-report    # 用户可见变更报告
/retro             # 工程复盘
```

---

*文档生成于 2026-05-23 · 基于 gstack v1.1.0*
