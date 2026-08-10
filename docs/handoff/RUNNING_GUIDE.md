# 怎么把项目跑起来

## 1. 环境要求

### 必需
- **Node.js 20.x LTS**（**不要 24**，Next.js 14 不兼容）
  - 下载: https://nodejs.org
  - 选左边的 "20.x.x LTS"（不是右边的最新 Current）
- **npm 9+**（Node 20 自带）

### 可选
- 一台能装 Node 的电脑（Windows / Mac / Linux 都行）
- 一个能用的 AI 模型 API（项目里默认用 DeepSeek）

### 验证环境
```bash
node --version    # 应该显示 v20.x.x
npm --version     # 应该 >= 9
```

---

## 2. 安装步骤（5 步跑起来）

```bash
# 1. 解压项目
tar -xzf portfolio-project.tar.gz
cd portfolio-project

# 2. 装依赖（首次需要 1-2 分钟）
npm install

# 3. 复制环境变量模板
cp .env.local.example .env.local

# 4. 编辑 .env.local，填入真实的 key
#    Windows: notepad .env.local
#    Mac: open .env.local
#    或者用 VSCode / Cursor 等编辑器

# 5. 跑起来
npm run dev
```

看到 `Local: http://localhost:3000` 就成功了 🎉

---

## 3. 访问项目

打开浏览器，访问：

- **首页**: http://localhost:3000
- **对话页**: http://localhost:3000/chat

---

## 4. 关键依赖

| 包 | 用途 | 必须 |
|---|---|---|
| `next` | Next.js 全栈框架 | ✅ |
| `react`, `react-dom` | UI 库 | ✅ |
| `openai` | OpenAI SDK（兼容 DeepSeek 协议）| ✅ |
| `@supabase/supabase-js` | Supabase 客户端 | ✅（暂未实际用）|
| `lucide-react` | 图标库 | ✅ |
| `tailwindcss` | 样式框架 | ✅ |
| `typescript` | 类型系统 | ✅ |
| `@types/node`, `@types/react` | 类型定义 | ✅ |

---

## 5. 环境变量配置

在 `.env.local` 中填入 3 个 key：

```env
# ============================================
# Supabase 配置
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# ============================================
# DeepSeek 配置
# ============================================
DEEPSEEK_API_KEY=sk-xxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

### 怎么获取这些 key

**Supabase**:
1. 打开 https://supabase.com
2. 进你的项目 → Settings → API
3. 复制 `Project URL` 和 `anon public` key

**DeepSeek**:
1. 打开 https://platform.deepseek.com
2. 注册 → 登录
3. API Keys → 创建 → 复制（只显示一次！）
4. 充值 1 元（够用几个月）

---

## 6. 故障排查

### 问题 1：npm install 超时
**原因**: 国内访问 npm 官方源慢
**解决**: 换淘宝镜像
```bash
npm config set registry https://registry.npmmirror.com
# 重新跑
npm install
```

### 问题 2：SWC 二进制损坏
**现象**: `next-swc.win32-x64-msvc.node is not a valid Win32 application`
**原因**: Windows + Node 24 不兼容
**解决**:
- **推荐**: 降级 Node 到 20 LTS
- **临时**: 强制重装 SWC
  ```bash
  Remove-Item -Recurse -Force "node_modules\@next\swc-win32-x64-msvc"
  npm install @next/swc-win32-x64-msvc@14.2.5
  ```

### 问题 3：端口 3000 被占
**解决**: 换端口
```bash
npm run dev -- -p 3001
```
然后访问 http://localhost:3001

### 问题 4：API key 无效
**现象**: "Invalid API Key" 错误
**解决**:
- 检查 `.env.local` 里的 key 完整、没空格、没引号
- 重启 dev server（让 .env.local 生效）
- 重新生成 key 再试

### 问题 5：访问 localhost:3000 打不开
**排查**:
- 检查 dev server 还在跑（PowerShell 窗口是否还开着）
- 试 `http://127.0.0.1:3000`
- 检查防火墙

---

## 7. 项目脚本

```bash
npm run dev      # 启动开发服务器
npm run build    # 生产构建
npm run start    # 启动生产服务器
npm run lint     # 代码检查（暂未配置）
```

---

## 8. 部署到 Vercel（待做，P2）

```bash
# 1. 推代码到 GitHub
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的用户名/portfolio-project.git
git push -u origin main

# 2. 打开 https://vercel.com
# 3. Import 你的 GitHub repo
# 4. 配置环境变量（粘贴 .env.local 的内容到 Vercel）
# 5. 部署完成
```

详细步骤在 `portfolio-project/docs/INTERVIEW.md` 之后会补充。

---

## 9. 文件结构速查

```
portfolio-project/
├── app/              # 页面
├── components/       # 组件
├── lib/              # 工具
├── docs/             # 文档
├── PRD.md            # 产品需求
├── 架构.md            # 技术架构
├── progress.md       # 开发进度（最详细）
└── README.md         # 项目内 README
```

要了解项目进展 → 读 `progress.md`
要了解产品定位 → 读 `PRD.md`
要了解技术决策 → 读 `架构.md`
