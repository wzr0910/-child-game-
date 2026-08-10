#!/usr/bin/env node
/**
 * session-context.mjs —— 「会话上下文续传」工具
 * ----------------------------------------------------------------
 * 痛点：开新窗口 / 新对话时，AI 不记得上次做到哪了，重读全部历史太累。
 * 解法：把冗长的对话 / 进度记录压缩成结构化要点，存成
 *       ① 状态对象  .session/session-context.json（机器可读）
 *       ② 可读摘要  .session/CONTEXT.md        （人 / AI 一眼看完）
 *       新窗口初始化时读这个摘要，即可恢复上下文，不用重读全部历史。
 *
 * 用法：
 *   node scripts/session-context.mjs save            手动压缩并保存（读 progress.md）
 *   node scripts/session-context.mjs watch [秒]      自动定期保存（默认每 30 秒）
 *   node scripts/session-context.mjs load            读取并打印摘要（模拟"新窗口注入"）
 *   node scripts/session-context.mjs init            生成空白 session-raw.txt 模板
 *
 * 设计要点：
 *   - 零依赖：只用 Node 内置 fs / path / url，任意环境直接跑
 *   - 压缩规则：扫描原始文本，按关键词把行分到 已完成 / 待办 / 关键变量 / 重要决策 四类
 *   - 降级：没有匹配行时，退回"最近 N 条要点"，保证永远有摘要
 *   - 可扩展：compressWithLLM() 预留了接 DeepSeek 的钩子（默认不调用，避免烧 token）
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, ".."); // portfolio-project 根
const SESSION_DIR = join(ROOT, ".session");
const JSON_PATH = join(SESSION_DIR, "session-context.json");
const MD_PATH = join(SESSION_DIR, "CONTEXT.md");
const DEFAULT_SOURCE = join(ROOT, "progress.md"); // 默认从 progress.md 读（它本就是结构化日志）

/** 分类规则：行内含关键词 → 归入对应桶 */
const RULES = [
  { key: "completed", label: "✅ 已完成", match: /✅|完成|已实现|done|落地|通过|打通/i },
  { key: "todos", label: "⏳ 待办", match: /⏳|待办|todo|\[\s*\]|待用户|下一步|未做|后续/i },
  { key: "variables", label: "🔑 关键变量", match: /process\.env\.[A-Z_]+|NEXT_PUBLIC_[A-Z_]+|DEEPSEEK_API_KEY|DEEPSEEK_BASE_URL|SUPABASE_URL|SUPABASE_ANON_KEY/i },
  { key: "decisions", label: "🧠 重要决策", match: /决策|决定|选择|采用|ADR|核心洞察|取舍|定位词/i },
];

const MAX_PER_BUCKET = 12;
const MAX_RECENT = 10;

/**
 * 压缩：原始文本 → 结构化状态对象
 * 纯规则实现，确定性、零成本、永远能跑。
 */
function compress(raw, sourceName) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const ctx = { completed: [], todos: [], variables: [], decisions: [], recent: [] };

  for (const line of lines) {
    // 去掉 markdown 列表符号 / 复选框，避免噪音
    const clean = line.replace(/^\s*[-*]\s*/, "").replace(/^\[\s*[x ]\s*\]/, "").trim();
    if (!clean) continue;
    // 跳过纯标题行（以 # 开头），避免把"### ✅ 今日完成"当成一条已完成
    if (clean.startsWith("#")) continue;

    let bucketed = false;
    for (const rule of RULES) {
      if (rule.match.test(clean)) {
        ctx[rule.key].push(clean);
        bucketed = true;
        break;
      }
    }
    if (!bucketed) ctx.recent.push(clean);
  }

  // 去重 + 限长，保证摘要永远比原文短
  for (const k of ["completed", "todos", "variables", "decisions"]) {
    ctx[k] = [...new Set(ctx[k])].slice(0, MAX_PER_BUCKET);
  }
  ctx.recent = [...new Set(ctx.recent)].slice(-MAX_RECENT);

  // 兜底：四个桶都空时，用最近 15 条充当摘要
  const empty =
    !ctx.completed.length && !ctx.todos.length && !ctx.variables.length && !ctx.decisions.length;
  if (empty) {
    ctx.recent = [...new Set(lines)].slice(-15);
  }

  ctx.updatedAt = new Date().toISOString();
  ctx.source = sourceName || DEFAULT_SOURCE;
  ctx.totalRawLines = lines.length;
  return ctx;
}

/**
 * （可选扩展）用 DeepSeek 进一步凝练——默认不调用，避免烧 token。
 * 想启用：设好 DEEPSEEK_API_KEY 后，把 compress() 换成 compressWithLLM()。
 */
async function compressWithLLM(raw) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "把下面的开发对话/进度，压缩成 JSON：{completed:[],todos:[],variables:[],decisions:[]}。只输出 JSON。",
        },
        { role: "user", content: raw },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  try {
    return { ...JSON.parse(data.choices?.[0]?.message?.content || "{}"), updatedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

/** 渲染可读摘要（结构化文本） */
function renderMarkdown(ctx) {
  const section = (label, items) =>
    `## ${label}\n` + (items.length ? items.map((i) => `- ${i}`).join("\n") : "- （无）") + "\n";

  return [
    "# 会话上下文摘要（自动生成，勿手改）",
    "",
    `> 更新时间：${ctx.updatedAt}`,
    `> 来源：${ctx.source}`,
    `> 原始行数：${ctx.totalRawLines} → 已压缩为要点`,
    "",
    section("✅ 已完成", ctx.completed),
    section("⏳ 待办", ctx.todos),
    section("🔑 关键变量", ctx.variables),
    section("🧠 重要决策", ctx.decisions),
    section("📌 最近要点", ctx.recent),
    "---",
    "> 新窗口初始化时读这个文件即可恢复上下文，无需重读全部历史。",
    "",
  ].join("\n");
}

function saveContext(ctx) {
  mkdirSync(SESSION_DIR, { recursive: true });
  writeFileSync(JSON_PATH, JSON.stringify(ctx, null, 2), "utf8");
  writeFileSync(MD_PATH, renderMarkdown(ctx), "utf8");
}

function loadContext() {
  if (!existsSync(JSON_PATH)) return null;
  return JSON.parse(readFileSync(JSON_PATH, "utf8"));
}

function getSourcePath(argv) {
  const i = argv.indexOf("--source");
  if (i !== -1 && argv[i + 1]) return resolve(ROOT, argv[i + 1]);
  return DEFAULT_SOURCE;
}

function doSave() {
  const src = getSourcePath(process.argv);
  if (!existsSync(src)) {
    console.error(`❌ 找不到源文件：${src}\n   先用 --source 指定，或确保 progress.md 存在。`);
    process.exit(1);
  }
  const raw = readFileSync(src, "utf8");
  const ctx = compress(raw, src);
  saveContext(ctx);
  console.log(
    `✅ 已保存上下文摘要 → .session/\n` +
      `   已完成 ${ctx.completed.length} · 待办 ${ctx.todos.length} · 变量 ${ctx.variables.length} · 决策 ${ctx.decisions.length} · 最近 ${ctx.recent.length}\n` +
      `   原始 ${ctx.totalRawLines} 行 → 摘要约 ${ctx.completed.length + ctx.todos.length + ctx.variables.length + ctx.decisions.length + ctx.recent.length} 条`
  );
}

function doWatch(secArg) {
  const ms = (Number(secArg) || 30) * 1000;
  console.log(`🔄 自动定期保存：每 ${ms / 1000} 秒压缩一次（Ctrl+C 退出）`);
  doSave();
  const timer = setInterval(doSave, ms);
  // 让进程保持运行；Ctrl+C 时清掉定时器再退出
  process.on("SIGINT", () => {
    clearInterval(timer);
    console.log("\n👋 已停止自动保存。");
    process.exit(0);
  });
}

function doLoad() {
  const ctx = loadContext();
  if (!ctx) {
    console.log("⚠️ 还没有摘要，先跑一次：node scripts/session-context.mjs save");
    return;
  }
  console.log(renderMarkdown(ctx));
  console.log("\n💡 把上面这段粘到新窗口，AI 即可秒懂先前进展。");
}

function doInit() {
  const tpl = [
    "# 会话原始记录（把对话要点粘到这里，再跑 save）",
    "",
    "## 已完成",
    "- ",
    "",
    "## 待办",
    "- ",
    "",
    "## 关键变量",
    "- DEEPSEEK_API_KEY=",
    "",
    "## 重要决策",
    "- ",
    "",
  ].join("\n");
  const p = join(ROOT, "session-raw.txt");
  writeFileSync(p, tpl, "utf8");
  console.log(`✅ 已生成模板：${p}`);
}

function printHelp() {
  console.log(`会话上下文续传工具

用法：
  node scripts/session-context.mjs save             手动压缩并保存（默认读 progress.md）
  node scripts/session-context.mjs save --source x.md   指定源文件
  node scripts/session-context.mjs watch [秒]       自动定期保存（默认 30 秒）
  node scripts/session-context.mjs load             读取并打印摘要（新窗口注入）
  node scripts/session-context.mjs init             生成空白 session-raw.txt 模板
`);
}

const [, , cmd] = process.argv;
switch (cmd) {
  case "save":
    doSave();
    break;
  case "watch":
    doWatch(process.argv[3]);
    break;
  case "load":
    doLoad();
    break;
  case "init":
    doInit();
    break;
  default:
    printHelp();
}
