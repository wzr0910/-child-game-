// EdgeOne Pages 国内版 Node Functions 入口。
// 国内版约定目录为 /node-functions/<route>.js，平台自动把 /api/gallery
// 路由到这个文件。导出必须是默认的 onRequest(context) 函数。
// 运行时：Node.js v20.x，支持完整 npm 生态。
// 环境变量通过 context.env.* 读取（不是 process.env）。

const MAX_KEY_PARTS = 8;
const TABLE_NAME = "declarations";

// 把分片 / 整段 / 缺号三种情况统一成一个 key。
function resolvePublishableKey(env) {
  // 整段优先（方便本地 .env.local 一次性写完）。
  const whole = (env.CLOUDBASE_PUBLISHABLE_KEY || "").trim();
  if (whole) return { key: whole, source: "whole", parts: 1 };

  // 分片按 _1 ~ _N 拼接，遇到缺号立即停止（避免拼出坏 key）。
  const segments = [];
  for (let i = 1; i <= MAX_KEY_PARTS; i += 1) {
    const seg = (env[`CLOUDBASE_PUBLISHABLE_KEY_${i}`] || "").trim();
    if (!seg) break;
    segments.push(seg);
  }
  if (segments.length > 0) {
    return { key: segments.join(""), source: "parts", parts: segments.length };
  }
  return { key: "", source: "none", parts: 0 };
}

function buildConfigStatus(envId, key, source, parts) {
  return {
    envIdLength: envId.length,
    envIdLooksValid: /^child-game-[a-z0-9]{16}$/.test(envId),
    keySource: source,
    keyParts: parts,
    keyLength: key.length,
    keyLooksLikeJwt: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key),
  };
}

// 标准 JSON 响应封装。
function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) },
  });
}

// 给 hint 提示生成更精确的状态文案。
function hintForStatus(status) {
  if (status === 401 || status === 403) {
    return "\u4e0a\u6e38\u62d2\u7edd\u9274\u6743\uff08401/403\uff09\u2014\u2014 Key \u62fc\u63a5\u4e0d\u5b8c\u6574 / RLS \u6ca1\u7ed9 anon \u653e\u884c";
  }
  if (status === 404) {
    return "\u4e0a\u6e38\u627e\u4e0d\u5230\u8868 / \u73af\u5883 ID \u65e0\u6548\uff080404\uff09\u2014\u2014 \u68c0\u67e5 public.declarations \u8868\u3001CLOUDBASE_ENV_ID";
  }
  if (status === 0) {
    return "\u8fde\u4e0d\u4e0a\u4e0a\u6e38\u2014\u2014 \u7f51\u5173\u8bf7\u6c42\u8d85\u65f6\u6216\u88ab\u62e6\u622a";
  }
  return "\u4e0a\u6e38\u8fd4\u56de\u975e\u6807\u51c6\u72b6\u6001\u7801\uff0c\u770b upstream.body";
}

async function readUpstream(envId, key, url) {
  const upstreamUrl = `https://${envId}.api.tcloudbasegateway.com/v1/rdb/rest/${TABLE_NAME}?${url}`;
  const upstream = await fetch(upstreamUrl, {
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
  });
  let body = null;
  try {
    body = await upstream.json();
  } catch (e) {
    body = null;
  }
  return { ok: upstream.ok, status: upstream.status, body };
}

async function insertUpstream(envId, key, payload) {
  const upstreamUrl = `https://${envId}.api.tcloudbasegateway.com/v1/rdb/rest/${TABLE_NAME}`;
  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  let body = null;
  try {
    body = await upstream.json();
  } catch (e) {
    body = null;
  }
  return { ok: upstream.ok, status: upstream.status, body };
}

function parseBody(raw) {
  if (!raw) return { __parseError: true };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { __parseError: true };
    return parsed;
  } catch (e) {
    return { __parseError: true };
  }
}

function validatePayload(p) {
  if (!p || p.__parseError || typeof p !== "object") return "invalid_json";
  const text = (p.declaration_text || "").toString().trim();
  if (!text) return "empty_declaration";
  if (text.length > 500) return "declaration_too_long";
  return null;
}

export default async function onRequest(context) {
  const { request, env } = context;
  const envId = (env.CLOUDBASE_ENV_ID || "").trim();
  const { key, source, parts } = resolvePublishableKey(env);
  const url = new URL(request.url);
  const isDebug = url.searchParams.get("debug") === "1";

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  // 写入路径
  if (request.method === "POST") {
    const raw = await request.text();
    const payload = parseBody(raw);
    const err = validatePayload(payload);
    if (err) {
      return jsonResponse({ ok: false, reason: err }, { status: 400 });
    }
    if (!envId || !key) {
      return jsonResponse(
        {
          ok: false,
          reason: !envId ? "missing_cloudbase_env_id" : "missing_publishable_key",
        },
        { status: 503 }
      );
    }
    const record = {
      declaration_text: payload.declaration_text.toString().trim(),
      card_name: ((payload.card_name || "").toString().trim() || "").slice(0, 80),
      card_style: ((payload.card_style || "default").toString().trim() || "default").slice(0, 40),
      created_at: new Date().toISOString(),
    };
    try {
      const upstream = await insertUpstream(envId, key, record);
      if (!upstream.ok) {
        return jsonResponse(
          {
            ok: false,
            reason: "upstream_insert_failed",
            upstream: { status: upstream.status, body: upstream.body },
            hint: hintForStatus(upstream.status),
          },
          { status: 502 }
        );
      }
      return jsonResponse({ ok: true, record });
    } catch (e) {
      return jsonResponse(
        { ok: false, reason: "upstream_unreachable", message: String(e && e.message || e) },
        { status: 502 }
      );
    }
  }

  // 读取路径
  if (request.method !== "GET") {
    return jsonResponse({ ok: false, reason: "method_not_allowed" }, { status: 405 });
  }

  const limitRaw = parseInt(url.searchParams.get("limit") || "60", 10);
  const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 60));
  const upstreamQs = `select=id,declaration_text,card_name,card_style,created_at&order=created_at.desc&limit=${limit}`;

  if (!envId || !key) {
    const reason = !envId ? "missing_cloudbase_env_id" : "missing_publishable_key";
    return jsonResponse(
      {
        configured: false,
        items: [],
        reason,
        config: buildConfigStatus(envId, key, source, parts),
        hint:
          reason === "missing_cloudbase_env_id"
            ? "\u73af\u5883 ID \u672a\u586b\u2014\u2014 EdgeOne \u73af\u5883\u53d8\u91cf CLOUDBASE_ENV_ID \u672a\u5b58\u5728\u6216\u672a redeploy"
            : "\u53d1\u5e03\u5bc6\u94a5\u672a\u586b / \u62fc\u51fa\u4e0d\u51fa\u6709\u6548 JWT",
      },
      { status: 200 }
    );
  }

  try {
    const upstream = await readUpstream(envId, key, upstreamQs);
    if (!upstream.ok) {
      if (isDebug) {
        return jsonResponse(
          {
            configured: false,
            items: [],
            reason: "upstream_failed",
            config: buildConfigStatus(envId, key, source, parts),
            upstream: { status: upstream.status, body: upstream.body },
            hint: hintForStatus(upstream.status),
          },
          { status: 200 }
        );
      }
      return jsonResponse(
        {
          configured: true,
          items: [],
          reason: "upstream_failed",
          upstream: { status: upstream.status },
          hint: hintForStatus(upstream.status),
        },
        { status: 200 }
      );
    }
    const rows = Array.isArray(upstream.body) ? upstream.body : [];
    const items = rows.map((r) => ({
      id: r.id,
      declaration_text: r.declaration_text,
      card_name: r.card_name,
      card_style: r.card_style,
      created_at: r.created_at,
    }));
    return jsonResponse({
      configured: true,
      items,
      reason: "ok",
      ...(isDebug
        ? {
            config: buildConfigStatus(envId, key, source, parts),
            hint: items.length > 0 ? "\u4e00\u5207\u6b63\u5e38\uff0c\u753b\u5eca\u5df2\u63a5\u901a" : "\u63a5\u901a\u4e86\uff0c\u4f46\u8fd8\u6ca1\u4eba\u53d1\u8fc7\u5ba3\u8a00\uff08items \u4e3a\u7a7a\uff09",
          }
        : {}),
    });
  } catch (e) {
    return jsonResponse(
      {
        configured: false,
        items: [],
        reason: "upstream_unreachable",
        message: String(e && e.message || e),
        ...(isDebug ? { config: buildConfigStatus(envId, key, source, parts) } : {}),
        hint: "\u8fde\u4e0d\u4e0a\u4e0a\u6e38 \u2014\u2014 \u68c0\u67e5 CLOUDBASE_ENV_ID \u662f\u5426\u6b63\u786e",
      },
      { status: 200 }
    );
  }
}