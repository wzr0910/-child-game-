/**
 * EdgeOne Pages 原生 Edge Function —— 提供 /api/gallery。
 *
 * 为什么同时存在 Next.js Route Handler 和 Edge Function 两份实现：
 *   - 公共画廊的读 / 写需要服务端在 EdgeOne 上跑代码，
 *     但用户的项目当前被部署成「静态 + Edge Functions」模式，
 *     Next.js Route Handler（app/api/gallery/route.ts）不会自动注册成 server。
 *   - 因此按 EdgeOne Pages 官方约定，把同一个接口在 /functions/api/gallery.js
 *     再写一份。文件路径 → URL 路径 = 文件名 /functions/api/gallery.js → /api/gallery。
 *   - 当之后 EdgeOne 项目切换到「Next.js 全栈」模式时，两份都可工作；
 *     EdgeOne 会优先匹配更具体的静态路径，行为可预期。
 *
 * 运行时限制（V8 isolate，不能用 Node 内置模块）：
 *   ❌ process.env / fs / node:crypto
 *   ✅ fetch / Request / Response / URL / URLSearchParams / crypto.subtle
 *   ✅ context.env 读环境变量
 *
 * 鉴权、字段、RLS 语义与 Next.js Route Handler 完全一致：
 *   见 ./cloudbase.ts 与 ./app/api/gallery/route.ts 的注释。
 */

// =========================================================================
// 凭证解析（与 lib/db/cloudbase.ts 同源）
// =========================================================================

const MAX_KEY_PARTS = 8;

function resolvePublishableKey(env) {
  // 1) 分片优先：EdgeOne 单个环境变量值上限 1000 字符，超长 key 只能切段存。
  //    只要 _1 存在，就按 _1、_2、_3 ... 顺序拼接，遇到缺号立即停止
  //    （防止顺序错乱静默拼出坏 key）。
  const firstPart = (env.CLOUDBASE_PUBLISHABLE_KEY_1 || "").trim();
  if (firstPart) {
    const segments = [firstPart];
    for (let i = 2; i <= MAX_KEY_PARTS; i += 1) {
      const seg = (env[`CLOUDBASE_PUBLISHABLE_KEY_${i}`] || "").trim();
      if (!seg) break;
      segments.push(seg);
    }
    return { key: segments.join(""), source: "parts", parts: segments.length };
  }

  // 2) 整段兜底（本地 .env.local 一般就这么写）
  const whole = (env.CLOUDBASE_PUBLISHABLE_KEY || "").trim();
  if (whole) {
    return { key: whole, source: "whole", parts: 1 };
  }

  return { key: "", source: "none", parts: 0 };
}

// =========================================================================
// HTTP 辅助
// =========================================================================

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      // 允许任意来源访问（画廊是公开内容）
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
  });
}

// =========================================================================
// 业务：拉取公开画廊（按 created_at 倒序）
// =========================================================================

async function fetchDeclarations(env, limit) {
  const envId = (env.CLOUDBASE_ENV_ID || "").trim();
  const { key, source, parts } = resolvePublishableKey(env);

  const configured = envId.length > 0 && key.length > 0;
  if (!configured) {
    return {
      configured: false,
      items: [],
      reason: !envId
        ? "missing CLOUDBASE_ENV_ID"
        : parts > 0
          ? "key_parts_incomplete"
          : "missing CLOUDBASE_PUBLISHABLE_KEY",
      config: buildConfigStatus(envId, key, source, parts),
    };
  }

  const base = `https://${envId}.api.tcloudbasegateway.com/v1/rdb/rest`;
  const url = `${base}/declarations?select=*&order=created_at.desc&limit=${encodeURIComponent(
    String(limit)
  )}`;

  const upstream = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  // 拿不到 body 时优雅降级，不要让前端看到运行时错误
  let bodyText = "";
  try {
    bodyText = await upstream.text();
  } catch (_) {
    /* 忽略 */
  }

  if (!upstream.ok) {
    const config = buildConfigStatus(envId, key, source, parts);
    let hint = `上游返回 ${upstream.status} —— 看下面 upstream.body 的具体报错`;
    if (upstream.status === 401 || upstream.status === 403) {
      hint =
        "上游拒绝鉴权（401/403）——Key 可能填错/拼接不完整，或表的 RLS 策略没给 anon 放行";
    } else if (upstream.status === 404) {
      // CloudBase 对「环境 ID 不存在」「表不存在」都返 404，需用 body 区分
      if (/INVALID_ENV/i.test(bodyText)) {
        hint = "环境 ID 无效 —— CLOUDBASE_ENV_ID 填错了";
      } else {
        hint =
          "上游找不到表（404）—— 确认 public.declarations 表已建好、表名拼写一致";
      }
    } else if (upstream.status === 0) {
      hint = "连不上上游 —— 检查 CLOUDBASE_ENV_ID 是否正确（域名由它拼出来）";
    }
    return {
      configured: true,
      items: [],
      reason: `upstream_${upstream.status}`,
      config,
      hint,
      upstream: { status: upstream.status, body: bodyText.slice(0, 500) },
    };
  }

  // 正常：PostgREST 返回的是数组；空表也返回 []
  let rows = [];
  try {
    rows = JSON.parse(bodyText);
  } catch (_) {
    /* 忽略 */
  }
  if (!Array.isArray(rows)) rows = [];

  // 字段映射（库里就是这几个公开字段，原样透传 + 截断防异常长串）
  const items = rows.map((r) => ({
    id: r.id,
    declaration_text: String(r.declaration_text ?? "").slice(0, 1000),
    card_name: String(r.card_name ?? "").slice(0, 80),
    card_style: String(r.card_style ?? "").slice(0, 60),
    created_at: r.created_at ?? null,
  }));

  return {
    configured: true,
    items,
    reason: "ok",
    config: buildConfigStatus(envId, key, source, parts),
    hint: "一切正常，画廊已接通",
  };
}

// =========================================================================
// 业务：POST 写入一条新宣言
// =========================================================================

async function insertDeclaration(env, payload) {
  const envId = (env.CLOUDBASE_ENV_ID || "").trim();
  const { key, source, parts } = resolvePublishableKey(env);
  const configured = envId.length > 0 && key.length > 0;

  if (!configured) {
    return {
      ok: false,
      status: 503,
      body: {
        error: "cloudbase_not_configured",
        message: "服务端未配置 CloudBase，画廊暂未开放",
      },
    };
  }

  const declaration_text = String(payload.declaration_text ?? "").trim();
  const card_name = String(payload.card_name ?? "").trim();
  const card_style = String(payload.card_style ?? "").trim();

  if (!declaration_text) {
    return {
      ok: false,
      status: 400,
      body: { error: "empty_declaration", message: "宣言内容不能为空" },
    };
  }
  if (declaration_text.length > 1000) {
    return {
      ok: false,
      status: 400,
      body: { error: "declaration_too_long", message: "宣言太长（最多 1000 字）" },
    };
  }

  const base = `https://${envId}.api.tcloudbasegateway.com/v1/rdb/rest`;
  const url = `${base}/declarations`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      declaration_text,
      card_name: card_name.slice(0, 80),
      card_style: card_style.slice(0, 60),
      created_at: new Date().toISOString(),
    }),
  });

  const bodyText = await upstream.text().catch(() => "");
  if (!upstream.ok) {
    let hint = `upstream_returned_${upstream.status}`;
    if (upstream.status === 401 || upstream.status === 403) {
      hint =
        "上游拒绝鉴权（401/403）——Key 拼接不完整 / 表的 RLS 没允许 anon insert";
    } else if (upstream.status === 404 && /INVALID_ENV/i.test(bodyText)) {
      hint = "环境 ID 无效 —— CLOUDBASE_ENV_ID 填错了";
    } else if (upstream.status === 404) {
      hint = "找不到 declarations 表 —— 表还没建或名字拼错";
    }
    return {
      ok: false,
      status: 502,
      body: {
        error: "upstream_error",
        upstreamStatus: upstream.status,
        upstreamBody: bodyText.slice(0, 500),
        hint,
        config: buildConfigStatus(envId, key, source, parts),
      },
    };
  }

  // Prefer: return=representation 时上游会把插入的行返回回来（数组形式）
  let inserted = null;
  try {
    const parsed = JSON.parse(bodyText);
    if (Array.isArray(parsed) && parsed.length > 0) inserted = parsed[0];
  } catch (_) {
    /* 忽略 */
  }

  return {
    ok: true,
    status: 201,
    body: {
      ok: true,
      inserted: inserted
        ? {
            id: inserted.id,
            declaration_text,
            card_name,
            card_style,
            created_at: inserted.created_at ?? new Date().toISOString(),
          }
        : {
            declaration_text,
            card_name,
            card_style,
            created_at: new Date().toISOString(),
          },
    },
  };
}

// =========================================================================
// 配置自检（暴露长度 / 结构特征，不含密钥明文）
// =========================================================================

function buildConfigStatus(envId, key, source, parts) {
  const dotCount = (key.match(/\./g) || []).length;
  return {
    envIdLength: envId.length,
    envIdLooksValid: /^child-game-[a-z0-9]{20,}$/i.test(envId),
    keySource: source,
    keyParts: parts,
    keyLength: key.length,
    keyPrefix: key.slice(0, 6),
    keyLooksLikeJwt: dotCount === 2 && !/\s/.test(key),
    keyDotCount: dotCount,
    keyHasWhitespace: /\s/.test(key),
  };
}

function buildDebugPayload(env) {
  const envId = (env.CLOUDBASE_ENV_ID || "").trim();
  const { key, source, parts } = resolvePublishableKey(env);
  const config = buildConfigStatus(envId, key, source, parts);
  return {
    configured: envId.length > 0 && key.length > 0,
    reason: !envId
      ? "missing CLOUDBASE_ENV_ID"
      : key.length === 0
        ? "missing CLOUDBASE_PUBLISHABLE_KEY"
        : !config.keyLooksLikeJwt
          ? "key_does_not_look_like_jwt"
          : "ok",
    config,
  };
}

// =========================================================================
// 入口
// =========================================================================

export default async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS 预检（兜底）
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // ---------- GET：拉公开画廊，?debug=1 走自检 ----------
  if (request.method === "GET") {
    if (url.searchParams.get("debug") === "1") {
      // 自检：直接真打一次上游，全链路贯通验证
      const real = await fetchDeclarations(env, 1);
      const debugInfo = buildDebugPayload(env);
      return jsonResponse({
        ...debugInfo,
        config: { ...debugInfo.config, ...(real.config || {}) },
        hint: real.hint,
        reason: real.reason,
        upstream: real.upstream,
      });
    }
    const limitRaw = parseInt(url.searchParams.get("limit") || "50", 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 100)
      : 50;
    const result = await fetchDeclarations(env, limit);
    return jsonResponse(result);
  }

  // ---------- POST：提交一条新宣言 ----------
  if (request.method === "POST") {
    let payload = {};
    try {
      payload = await request.json();
    } catch (_) {
      return jsonResponse({ error: "invalid_json" }, 400);
    }
    const result = await insertDeclaration(env, payload);
    return jsonResponse(result.body, result.status);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, {
    Allow: "GET, POST",
  });
}
