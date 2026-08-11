import { NextRequest, NextResponse } from "next/server";
import {
  getCloudBaseRestBase,
  getCloudBaseHeaders,
  getCloudBaseConfigStatus,
  isCloudBaseConfigured,
} from "@/lib/db/cloudbase";

/**
 * 公共画廊接口（服务端中转，避开浏览器直连 CloudBase 的域名白名单问题）
 *
 * 底层走 CloudBase PG 模式的 PostgREST 端点：
 *   GET  https://{envId}.api.tcloudbasegateway.com/v1/rdb/rest/declarations?select=*&order=created_at.desc&limit=N
 *   POST https://{envId}.api.tcloudbasegateway.com/v1/rdb/rest/declarations
 * 鉴权：Authorization: Bearer <Publishable Key>（anon 角色，受 RLS 约束）
 *
 * GET  /api/gallery?limit=60  → 返回 { configured, items }
 *      configured=false 表示服务端还没配 CloudBase 环境变量，前端显示「还没开放」
 * GET  /api/gallery?debug=1   → 返回配置自检 + 上游连通性诊断（不含密钥明文）
 * POST /api/gallery           → 写入一条公开宣言 { declaration_text, card_name, card_style }
 *
 * 全部运行在 Node.js 服务端（runtime = "nodejs"），密钥不出服务器。
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "declarations";

/**
 * 自检：把「环境变量读到了什么」+「上游 CloudBase 怎么回的」一次性吐出来。
 * 部署在 EdgeOne 上看不到服务端日志，这个接口就是唯一的排查窗口。
 * 安全：只返回长度/结构特征和上游错误文本，绝不返回 key 明文。
 */
async function buildDebugPayload() {
  const status = getCloudBaseConfigStatus();

  if (!status.configured) {
    return {
      ...status,
      hint: !status.hasEnvId
        ? "缺少 CLOUDBASE_ENV_ID —— 请在 EdgeOne 环境变量里添加，然后重新部署"
        : "缺少 Publishable Key —— 请填 CLOUDBASE_PUBLISHABLE_KEY，或分片填 CLOUDBASE_PUBLISHABLE_KEY_1 / _2 / _3，然后重新部署",
      upstream: null,
    };
  }

  // 已配置：真打一次上游，看看能不能通
  let upstream: { ok: boolean; status: number; body: string };
  try {
    const url = `${getCloudBaseRestBase()}/${TABLE}?select=id&limit=1`;
    const res = await fetch(url, {
      headers: getCloudBaseHeaders(),
      cache: "no-store",
    });
    const body = await res.text().catch(() => "");
    upstream = {
      ok: res.ok,
      status: res.status,
      // 上游错误体（PostgREST 会说清是表不存在/RLS 拦了/token 无效），截断防刷屏
      body: body.slice(0, 500),
    };
  } catch (e) {
    upstream = {
      ok: false,
      status: 0,
      body: e instanceof Error ? e.message : String(e),
    };
  }

  let hint = "一切正常，画廊已接通";
  if (!upstream.ok) {
    const s = upstream.status;
    const body = upstream.body;
    // CloudBase 网关的错误码优先于 HTTP 状态码 —— 实测环境 ID 写错时
    // 它也返回 404，但 body 里是 INVALID_ENV，跟「表不存在」完全是两回事。
    if (body.includes("INVALID_ENV")) {
      hint =
        "环境 ID 无效 —— CLOUDBASE_ENV_ID 填错了，应为 child-game-d4gxbdz4zce7a5c3b";
    } else if (s === 401 || s === 403) {
      hint =
        "上游拒绝鉴权（401/403）—— Key 填错或分片拼接不完整；也可能是 RLS 策略没给 anon 放行";
    } else if (s === 404) {
      hint =
        "上游 404 —— 若 body 里提到 relation/table，说明 public.declarations 表没建好或表名不一致";
    } else if (s === 0) {
      hint = "网络层就没连上 —— 看 upstream.body 里的具体网络错误";
    } else {
      hint = `上游返回 ${s} —— 看 upstream.body 的具体报错`;
    }
  }

  return { ...status, hint, upstream };
}

export async function GET(req: NextRequest) {
  // 自检模式：/api/gallery?debug=1
  if (req.nextUrl.searchParams.get("debug") === "1") {
    return NextResponse.json(await buildDebugPayload());
  }

  if (!isCloudBaseConfigured) {
    const status = getCloudBaseConfigStatus();
    return NextResponse.json({
      configured: false,
      items: [],
      // 轻量提示，方便一眼看出是缺哪个（不含任何密钥内容）
      reason: !status.hasEnvId ? "missing_env_id" : "missing_publishable_key",
    });
  }

  try {
    const raw = Number(req.nextUrl.searchParams.get("limit") ?? "60");
    const limit = Math.min(Math.max(Number.isFinite(raw) ? raw : 60, 1), 100);

    const base = getCloudBaseRestBase();
    const headers = getCloudBaseHeaders();
    const url = `${base}/${TABLE}?select=*&order=created_at.desc&limit=${limit}`;

    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[gallery] GET non-ok:", res.status, detail);
      return NextResponse.json({ configured: true, items: [] });
    }

    const rows = (await res.json()) as Array<Record<string, any>>;
    const items = (Array.isArray(rows) ? rows : []).map((d) => ({
      id: String(d.id ?? ""),
      declaration_text: d.declaration_text ?? "",
      card_name: d.card_name ?? "",
      card_style: d.card_style ?? "",
      created_at: d.created_at ?? new Date().toISOString(),
    }));

    return NextResponse.json({ configured: true, items });
  } catch (e) {
    console.error("[gallery] GET failed:", e);
    return NextResponse.json({ configured: true, items: [] });
  }
}

export async function POST(req: NextRequest) {
  if (!isCloudBaseConfigured) {
    return NextResponse.json({ error: "gallery not configured" }, { status: 503 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const text = String(body.declaration_text ?? "").trim();
    const name = String(body.card_name ?? "").trim();
    const style = String(body.card_style ?? "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "declaration_text required" },
        { status: 400 }
      );
    }

    const base = getCloudBaseRestBase();
    const headers = getCloudBaseHeaders();
    const res = await fetch(`${base}/${TABLE}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        declaration_text: text,
        card_name: name,
        card_style: style,
        created_at: new Date().toISOString(),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[gallery] POST failed:", res.status, detail);
      return NextResponse.json({ error: "save failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[gallery] POST failed:", e);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
}
