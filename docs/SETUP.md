# 🚀 安装与运行指南

> 跟着做，10 分钟内让项目跑起来

## ✅ 前置条件检查

打开终端（Windows 用 PowerShell / cmd，Mac 用 Terminal），依次输入：

```bash
node --version    # 应该 ≥ 18
npm --version     # 应该 ≥ 9
```

如果没装 Node.js：去 https://nodejs.org 下载 LTS 版本安装。

---

## 📦 Step 1：安装依赖

```bash
cd portfolio-project
npm install
```

⏰ 等 1-2 分钟（会装几十个包）。

---

## 🔑 Step 2：配置环境变量

```bash
# 复制模板
cp .env.local.example .env.local

# 用编辑器打开（任选一种）
# Mac: open .env.local
# Windows: notepad .env.local
# VSCode: code .env.local
```

把里面的占位值替换成你记事本里的真实值：

```
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key（完整长串）
DEEPSEEK_API_KEY=sk-xxxxx
```

> ⚠️ **重要**：
> - `DEEPSEEK_API_KEY` 不要有引号，**直接换值**就行。
> - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 必须填 **Supabase 后台 `Project Settings → API` 里复制的完整 anon key**。`example` 文件里那个 `eyJhbGc...` 是截断占位符，不能直接用，否则公共画廊会连不上。
> - 这两个 Supabase 变量不填也能跑：公共画廊会显示「还没开放」，本地收藏照常。

---

## 🎬 Step 3：跑起来！

```bash
npm run dev
```

看到这行就成功了：
```
✓ Ready in 3s
Local: http://localhost:3000
```

打开浏览器访问 **http://localhost:3000** → 看到"孩子的游戏"首页 → 点按钮进对话页 → 和查拉图斯特拉聊！

---

## 🆘 常见错误

### 错误 1：`Cannot find module 'next'`
→ 没装依赖，回去跑 `npm install`

### 错误 2：`Invalid API Key`
→ 检查 .env.local 里的 DEEPSEEK_API_KEY 是不是完整、没空格、没引号

### 错误 3：对话页显示"出错了"
→ 看终端的报错信息，最常见是 API key 问题

### 错误 4：页面打不开
→ 检查端口 3000 是不是被占了，换端口：`npm run dev -- -p 3001`

---

## 🔄 每次开发流程

```
1. 编辑代码（在 Cursor / Trae / VSCode 里）
2. 保存
3. 浏览器自动刷新（Next.js 热更新）
4. 看效果
```

不用每次重启 dev server！

---

## 📂 项目结构说明

```
portfolio-project/
├── app/                    # 页面（前端 + 后端都在这）
│   ├── page.tsx           # 首页 /
│   ├── chat/page.tsx      # 对话页 /chat
│   └── api/chat/route.ts  # 后端 API（处理 AI 调用）
│
├── components/             # 可复用组件
│   ├── ChatWindow.tsx     # 对话窗口
│   ├── Message.tsx        # 单条消息
│   └── StepIndicator.tsx  # 进度指示
│
├── lib/                    # 工具库
│   ├── ai/
│   │   ├── deepseek.ts   # DeepSeek 客户端
│   │   └── prompts.ts    # AI 角色 prompt
│   └── db/supabase.ts    # 数据库客户端
│
├── docs/                   # 文档
├── .env.local.example     # 环境变量模板
└── package.json
```

---

## ✅ 跑通后，告诉我"跑起来了"！

P0 已做完（对话 → 3 候选 → 风格命名 → 宣言卡片）。下一步：
- 接 Supabase 公共画廊（建表 SQL + 环境变量，见下方提示）
- 部署到 Vercel 上线（**完整步骤见 `README.md` 的「部署到 Vercel」一节**）

> 💡 想接公共画廊：去 Supabase SQL Editor 执行建表语句（见 `README.md`「接入 Supabase 公共画廊」一节），再把完整的 anon key 填进 `.env.local`。
