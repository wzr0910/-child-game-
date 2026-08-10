# 孩子的游戏 · AI 哲学共读平台

> 我的作品集项目 · 哲学背景 × AI 能力的产品实践
> 一句话：**帮你找到那件你"愿意"做的事**——用尼采的"孩子"精神，而不是测评标签。

用户在 3 轮对话里（回忆 → 觉察 → 命名），和 AI 扮演的查拉图斯特拉聊，最后共创出一张属于自己的「孩子宣言」卡片，可以复制文字、存成图片、分享到朋友圈 / 小红书。

---

## 🛠️ 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 前端 + 后端 | Next.js 14（App Router） | 一套搞定，部署简单 |
| 样式 | Tailwind CSS | 自定义哲学主题色（羊皮纸 / 墨 / 金） |
| AI 大模型 | DeepSeek（OpenAI 接口兼容） | 不填 key 也能跑「演示模式」 |
| 数据库 | Supabase（PostgreSQL） | 公共画廊用，可选接入 |
| 部署 | Vercel | 免费、Next.js 官方支持 |

---

## 📂 项目结构（核心）

```
portfolio-project/
├── app/
│   ├── page.tsx                    # 首页 /
│   ├── chat/page.tsx               # 对话页 /chat
│   ├── gallery/page.tsx            # 宣言画廊 /gallery（我的 + 公共）
│   ├── about/page.tsx              # 关于页
│   ├── api/chat/route.ts           # 聊天 API（限流/校验/降级）
│   └── api/generate-candidates/route.ts  # 生成宣言候选 API
├── components/
│   ├── ChatWindow.tsx              # 对话主状态机（核心）
│   ├── PublicGallery.tsx           # 公共画廊（云端）
│   ├── GalleryList.tsx             # 我的宣言（本地）
│   ├── DeclarationCard.tsx         # 宣言卡片
│   └── ...
├── lib/
│   ├── ai/                         # DeepSeek 客户端 + 角色 prompt
│   ├── db/supabase.ts              # Supabase 客户端（含建表 SQL）
│   ├── db/declarations.ts          # 云端读写封装（本次新增）
│   └── utils/                      # 本地存储 / 画廊 / 卡片导出
├── docs/                           # 安装指南 / 面试话术等
├── PRD.md / 架构.md / progress.md  # 产品 / 技术 / 进度文档
└── .env.local.example              # 环境变量模板（安全，可提交）
```

---

## 🚀 本地运行（5 分钟）

**前置条件**：装好 Node.js（≥ 18），终端输入 `node --version` 确认。

```bash
# 1. 进入项目
cd portfolio-project

# 2. 安装依赖（首次约 1-2 分钟）
npm install

# 3. 准备环境变量（详见下一节）
cp .env.local.example .env.local
#    然后用记事本 / VSCode 打开 .env.local，把占位值换成真实值

# 4. 启动
npm run dev
```

看到 `✓ Ready` 后，打开 **http://localhost:3000** → 点「和查拉图斯特拉对话」→ 走完 3 轮 → 生成宣言卡片。

> 💡 没填任何 key 也能跑：对话走「演示模式」（预置回复），画廊只显示本地收藏。先体验再接真实服务。

---

## 🔑 环境变量

复制 `.env.local.example` 得到 `.env.local`，按下面填：

| 变量 | 作用 | 是否必填 | 是否公开 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | 接公共画廊才需要 | ✅ 会进前端 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 key | 接公共画廊才需要 | ✅ 会进前端 |
| `DEEPSEEK_API_KEY` | DeepSeek API key | 想要真实 AI 对话才需要 | ❌ 仅服务端 |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` | 一般不用改 | — |

**规则**：
- 不填 `DEEPSEEK_API_KEY` → 演示模式，站点不崩。
- 不填 Supabase 两个变量 → 公共画廊显示「还没开放」，本地收藏照常。
- `.env.local` 已被 `.gitignore` 忽略，**不会**被提交，放心填真实值。

---

## 🗄️ 接入 Supabase 公共画廊（可选，但作品集推荐）

让「宣言画廊」能展示所有人的宣言，且你换设备也能看到自己收藏。

**第 1 步：拿到凭据**
Supabase 后台（https://supabase.com）→ 新建项目 → `Project Settings → API`，复制：
- `Project URL` → 填 `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → 填 `NEXT_PUBLIC_SUPABASE_ANON_KEY`（**要完整的那一长串**，不是截断的）

**第 2 步：建表**
Supabase → `SQL Editor` → 新建查询，粘贴下面这段，点 `Run`：

```sql
create table declarations (
  id uuid primary key default gen_random_uuid(),
  user_input jsonb,
  declaration_text text not null,
  card_style text,
  card_name text,
  created_at timestamptz default now()
);

alter table declarations enable row level security;

-- 任何人（含匿名）可读公共画廊
create policy "public read" on declarations
  for select using (true);

-- 任何人（含匿名）可写入，但表结构无身份字段，天然不泄露隐私
create policy "public insert" on declarations
  for insert with check (true);

create index declarations_created_at_idx
  on declarations (created_at desc);
```

**第 3 步：验证**
重启 `npm run dev` → 生成一份宣言 → 打开 `/gallery`，下方「公共画廊」应出现你刚生成的卡片。

> 🔒 隐私设计：云端表只有 `宣言文字 / 风格 / 名字 / 时间`，没有任何用户身份信息，匿名即可写入。

---

## 🌐 部署到 Vercel（让面试官能直接打开）

本项目**不是 git 仓库**，推荐走「GitHub 导入」这条路：

### 方式 A：GitHub 导入（推荐）

```bash
# 1. 初始化并提交
git init
git add .
git commit -m "init: 孩子的游戏 v0.1"

# 2. 在 GitHub 新建一个空仓库，拿到地址后关联并推送
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

然后在 Vercel：
1. 登录 https://vercel.com → **Add New → Project**
2. **Import** 刚才的 GitHub 仓库（Framework 会自动识别为 Next.js）
3. 进入项目 **Settings → Environment Variables**，把 `.env.local` 里的 4 个变量**原样**填进去（名字和值都要一致）
4. 点 **Deploy** → 拿到形如 `https://孩子的游戏.vercel.app` 的网址

> 之后每次 `git push` 到 main，Vercel 会自动重新部署。

### 方式 B：Vercel CLI（不依赖 GitHub）

```bash
npx vercel          # 首次按提示登录，一路回车
# 部署前记得在 Vercel 后台的 Environment Variables 里填好变量
```

### 部署小贴士
- 不填 `DEEPSEEK_API_KEY` 也能部署成功，站点以**演示模式**运行（对话用预置回复），不会白屏。
- `NEXT_PUBLIC_` 开头的变量会打进前端（本来就该公开）；`DEEPSEEK_API_KEY` 只在服务端用，安全。
- 公共画廊要生效，Vercel 的环境变量里**必须**也有两个 `NEXT_PUBLIC_SUPABASE_*`，且 Supabase 表已建好。

---

## 📚 文档导航

- `README.md` —— 本文件（运行 / 接入 / 部署）
- `PRD.md` —— 产品需求（做什么、为什么、给谁用）
- `架构.md` —— 技术架构设计
- `progress.md` —— 开发进度日志（新对话先读这个）
- `docs/SETUP.md` —— 本地安装细节与常见错误
- `docs/INTERVIEW.md` —— 面试话术与作品集叙事
- `docs/NEW_SESSION.md` —— 新会话开工指南（无缝续上之前的成果）
