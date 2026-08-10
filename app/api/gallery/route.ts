import { NextRequest, NextResponse } from "next/server";
import {
  getCloudBaseRestBase,
  getCloudBaseHeaders,
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
 * POST /api/gallery           → 写入一条公开宣言 { declaration_text, card_name, card_style }
 *
 * 全部运行在 Node.js 服务端（runtime = "nodejs"），密钥不出服务器。
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "declarations";

export async function GET(req: NextRequest) {
  if (!isCloudBaseConfigured) {
    return NextResponse.json({ configured: false, items: [] });
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
