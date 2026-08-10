# 🤖 AI 读我：项目交接文档

> **你的任务**：接手或继续这个项目
> **你的工作**：理解上下文 → 继续工作
> **不需要再问用户**关于项目定位、技术选型、风格选择等问题——都在这份文档里

---

## 🚨 0. TL;DR（一分钟速览）

| 项目 | 「孩子的游戏」（Child's Game）|
|---|---|
| **一句话** | 用尼采"孩子"哲学 + AI，让 20-30 岁奥德赛时期年轻人通过 3 轮对话重新发现自己"愿意"做的事 |
| **用户** | 湖北大学哲学学院本科生（王梓睿/wzr0910），大三大四暑假，目标 AI 产品经理岗位 |
| **当前进度** | 约 70% 完成。MVP 已跑通，P0 全部实现 |
| **技术栈** | Next.js 14 + TypeScript + Tailwind + DeepSeek + Supabase（暂未接入）|
| **核心创新** | Co-Creation 机制（AI 给候选 → 用户选/改/命名 → 生成专属宣言卡片）|
| **下一个人工** | P0 收尾（API 安全、门面、体验细节、作品集 README）|

---

## 1. 必读文件（按优先级）

| # | 文件 | 必读理由 |
|---|---|---|
| 1 | `PROJECT_OVERVIEW.md` | 项目完整背景、用户画像、决策依据 |
| 2 | `RUNNING_GUIDE.md` | 怎么把项目跑起来 |
| 3 | `portfolio-project/progress.md` | **最详细的开发进度日志**（每次会话更新）|
| 4 | `portfolio-project/PRD.md` | 产品需求文档 v0.3 |
| 5 | `portfolio-project/docs/INTERVIEW.md` | 作品集面试话术 + 题目库 |
| 6 | `portfolio-project/架构.md` | 技术架构决策记录 |

---

## 2. 项目结构总览

```
portfolio-handoff/                 ← 你在这里
├── AI_README.md                   ← 你正在读的（AI 专用入口）
├── PROJECT_OVERVIEW.md            ← 项目完整背景
├── RUNNING_GUIDE.md               ← 怎么跑
├── HANDOFF_NOTES.md               ← 交接注意事项
│
└── portfolio-project/             ← 主项目代码
    ├── README.md                  ← 项目内 README
    ├── PRD.md                     ← 产品需求
    ├── 架构.md                     ← 技术架构
    ├── progress.md                ← 开发进度（最详细）
    │
    ├── package.json               ← 依赖清单
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── .env.local.example         ← 环境变量模板
    ├── .gitignore
    │
    ├── app/                       ← Next.js App Router
    │   ├── layout.tsx
    │   ├── page.tsx               ← 首页
    │   ├── globals.css
    │   ├── chat/
    │   │   └── page.tsx           ← 对话页
    │   └── api/
    │       ├── chat/route.ts      ← 聊天 API
    │       └── generate-candidates/route.ts  ← 候选生成 API
    │
    ├── components/                ← 7 个 React 组件
    │   ├── ChatWindow.tsx         ← 主状态机（5 步骤）
    │   ├── Message.tsx            ← 消息气泡
    │   ├── StepIndicator.tsx      ← 进度指示
    │   ├── CandidateSelector.tsx  ← 候选选择
    │   ├── StyleSelector.tsx      ← 风格选择
    │   └── DeclarationCard.tsx    ← 最终卡片
    │
    ├── lib/                       ← 工具库
    │   ├── ai/
    │   │   ├── deepseek.ts        ← DeepSeek 客户端
    │   │   └── prompts.ts         ← 查拉图斯特拉 prompt
    │   ├── db/
    │   │   └── supabase.ts        ← Supabase 客户端（暂未用）
    │   └── utils/
    │       └── storage.ts         ← localStorage 工具
    │
    └── docs/
        ├── SETUP.md               ← 安装指南
        └── INTERVIEW.md           ← 面试话术 + 题目库
```

---

## 3. 关键决策（已锁定，不要再问用户）

| 决策 | 内容 | 锁定日期 |
|---|---|---|
| 首本经典 | 《查拉图斯特拉如是说》尼采 | 2026-08-09 |
| 核心哲学 | 聚焦"孩子"阶段（不是骆驼/狮子）| 2026-08-09 |
| AI 角色 | 查拉图斯特拉（B+C 风格：隐喻+挑衅）| 2026-08-09 |
| 技术栈 | Next.js 14 + TS + Tailwind + DeepSeek + Supabase | 2026-08-10 |
| 核心机制 | Co-Creation（用户参与式生成）| 2026-08-09 |
| 视觉风格 | 哲学主题（羊皮纸 + 墨色 + 金色）| 2026-08-10 |
| 目标用户定位词 | "奥德赛时期" | 2026-08-09 |

---

## 4. 已解决的核心痛点

✅ **"上下文崩坏"** → 三层文档接力（PRD/架构/progress + 每次会话读 progress.md）
✅ **"纯前端没后端"** → Next.js 全栈一体化
✅ **"缺 AI API"** → DeepSeek 集成（OpenAI SDK 兼容）
✅ **"产品即隐喻"** → 选"孩子"哲学，呼应用户做这个产品的过程本身

---

## 5. 当前项目状态（70% 完成）

### ✅ 已完成（P0）
- 完整 Next.js 全栈代码（~1970 行）
- 3 轮对话主流程
- **Co-Creation 机制**（5 步骤状态机）
- **宣言卡片 4 种风格**（简约/古典/未来感/手绘）
- **localStorage 历史保存**
- 一键复制宣言（带 #孩子的游戏 标签）
- DeepSeek 集成 + Prompt 系统
- 哲学主题 UI

### 🔴 待做（P0 收尾）
- API 安全（限流、超时、max_tokens）
- 作品集门面（favicon、OG、robots.txt、sitemap）
- 全局导航 + 页脚
- 替换 alert() → 自制 toast
- React Error Boundary
- 作品集 README（产品介绍 + 截图 + 决策复盘）

### 🟡 待做（P1）
- 错误处理优化
- 加载骨架屏
- 移动端深度适配

### 🟢 待做（P2）
- Supabase 数据持久化
- 部署 Vercel
- AI 生图 API
- 宣言画廊（UGC 闭环）

---

## 6. 用户特点（影响工作方式）

- **角色**: 哲学专业本科生，目标 AI 产品经理
- **水平**: 有前端基础（做过静态网页），无后端 / AI 经验
- **学习能力**: 强，喜欢"边做边学"
- **痛点**: 之前项目因"上下文崩坏"半途而废，**对"项目能不能持续做下去"有焦虑**
- **心理需求**: 需要鼓励 + 确定性 + 清晰的下一步
- **沟通风格**: 喜欢直接、挑刺、有产品感的反馈
- **特别注意**: 不要一次给太多信息，要分步引导

---

## 7. 模拟面试成果（作品集叙事）

已完成 4 道模拟面试题，用户具备以下能力：

| 能力维度 | 评分 | 关键证据 |
|---|---|---|
| 产品哲学（vs 竞品本质差异）| ⭐⭐⭐⭐ | "工具 vs 陪伴"代际差异 |
| 增长 / 传播设计 | ⭐⭐⭐ | MBTI 传播机制分析 |
| AI 产品体验设计 | ⭐⭐⭐⭐⭐ | **杀手级**："让用户参与生成"洞察（直接催生 Co-Creation 机制）|
| Pitch / 讲故事 | ⭐⭐⭐⭐ | **杀手级**：脱口而出"奥德赛时期"概念 |

### 模拟面试题目库（备用）
- Q1: 你的产品和 MBTI 等职业规划工具有什么差异化？
- Q2: 用户凭什么愿意分享你的产品？
- Q3: 怎么保证用户拿到的卡片 80% 以上是愿意晒的？
- Q4: 30 秒向 CEO 介绍你的产品？
- Q5: 为什么选择"孩子"这个角度？其他两个阶段不行吗？
- Q6: 如果让你重做一次，你会改什么？

完整答案在 `portfolio-project/docs/INTERVIEW.md`

---

## 8. 紧急待办清单

按"作品集必做"优先级排序：

```
🔴 P0-1: API 安全
   - app/api/chat/route.ts 加 max_tokens
   - app/api/chat/route.ts 加超时（AbortController）
   - app/api/chat/route.ts 加内存级 rate limit
   - app/api/generate-candidates/route.ts 同上

🔴 P0-2: 作品集门面
   - public/favicon.ico
   - app/layout.tsx 加 og: meta
   - app/sitemap.ts + app/robots.ts
   - 全局导航组件
   - 页脚组件

🔴 P0-3: 体验细节
   - 替换 ChatWindow 里的 alert() → toast
   - 写 React Error Boundary
   - input 加 label
   - 加复制成功提示

🔴 P0-4: 作品集 README
   - 重写 portfolio-project/README.md
   - 加截图 / GIF
   - 加技术选型理由
   - 加"我做了什么决策"复盘
```

---

## 9. 怎么继续（你接手后的步骤）

### 场景 A：用户来新对话了
```
1. 读这份 AI_README.md（已完成）
2. 读 portfolio-project/progress.md 了解最新进度
3. 询问用户: "项目当前到第几步了？"
4. 根据用户回答 + 待办清单继续
```

### 场景 B：继续开发
```
1. 读 PROJECT_OVERVIEW.md（了解背景）
2. 读 portfolio-project/PRD.md（了解产品定位）
3. 读 portfolio-project/架构.md（了解技术决策）
4. 按 P0 → P1 → P2 顺序推进
```

### 场景 C：模拟面试
```
1. 读 portfolio-project/docs/INTERVIEW.md
2. 问用户: "想练哪道题？"
3. 用进度日志中的"用户答案要点"做对比评估
4. 给出"产品经理能力雷达"反馈
```

---

## 10. 关键 Prompt 资产（产品 IP）

`portfolio-project/lib/ai/prompts.ts` 是项目的**核心 IP 资产**：
- 查拉图斯特拉角色设定（4 阶段）
- Co-Creation 候选生成 prompt

未来这个 prompt 可以：
- 申请专利（产品方法专利）
- 写成技术博客（产品经理 + Prompt Engineering 实战）
- 收录到产品经理面试题库

---

## 11. 时间线

| 日期 | 里程碑 |
|---|---|
| 2026-08-09 | 项目启动，文档框架搭建，模拟面试 4 题完成 |
| 2026-08-10 早 | 申请 DeepSeek + Supabase |
| 2026-08-10 晚 | 完整代码生成（24 个文件，~1970 行）|
| 2026-08-10 22:00 | 项目本地跑通 |
| 2026-08-10 22:54 | P0 全部实现（Co-Creation + 卡片 + 历史）|
| 2026-08-11 00:00 | 外部 AI 审查，提出 4 项 P0 收尾 |
| 2026-08-11 00:58 | 项目交接包生成 |

---

## 12. 联系方式

- **用户**: 王梓睿 (wzr0910)
- **邮箱**: 3304236052@qq.com（来自 Supabase owner 信息）
- **目标**: 湖北本地 AI 产品经理 / 运营策划岗

---

## 13. 致下一个 AI

这个项目的核心不是"做个网站"，而是：

1. **帮一个哲学背景的本科生做出差异化作品集**（用 AI 解决"哲学+AI"无人铺路的问题）
2. **完整跑通"从产品设计到代码实现"全流程**（展示 PM 的端到端能力）
3. **建立"可延续的工作机制"**（解决之前"上下文崩坏"的问题）

如果你接手，**请保持这个初心**。不要为"功能"而"功能"，要为"作品集竞争力"而"功能"。

**祝你合作愉快！** 🎉
