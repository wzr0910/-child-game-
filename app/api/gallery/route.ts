import { NextRequest, NextResponse } from "next/server";
import { getCloudBaseDb, isCloudBaseConfigured } from "@/lib/db/cloudbase";

/**
 * 公共画廊接口（服务端中转，避开浏览器直连 CloudBase 的域名白名单问题）
 *
 * GET  /api/gallery?limit=60  → 返回 { configured, items }
 *      configured=false 表示服务端还没配 CloudBase 环境变量，前端显示「还没开放」
 * POST /api/gallery           → 写入一条公开宣言 { declaration_text, card_name, card_style }
 *
 * 全部运行在 Node.js 服务端（runtime = "nodejs"），密钥不出服务器。
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "declarations";
let _ensured = false;

/** 集合不存在时尝试创建一次（忽略「已存在」等报错） */
async function ensureCollection(db: any) {
  if (_ensured) return;
  try {
    await db.createCollection(COLLECTION);
  } catch {
    // 已存在 / 无权限创建都忽略，写入时若仍失败会走外层 catch
  }
  _ensured = true;
}

export async function GET(req: NextRequest) {
  if (!isCloudBaseConfigured) {
    return NextResponse.json({ configured: false, items: [] });
  }
  try {
    const db = await getCloudBaseDb();
    const raw = Number(req.nextUrl.searchParams.get("limit") ?? "60");
    const limit = Math.min(Math.max(Number.isFinite(raw) ? raw : 60, 1), 100);

    const res = await db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const items = (res.data ?? []).map((d: any) => ({
      id: d._id,
      declaration_text: d.declaration_text ?? "",
      card_name: d.card_name ?? "",
      card_style: d.card_style ?? "",
      created_at: d.createdAt ?? new Date().toISOString(),
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

    const db = await getCloudBaseDb();
    await ensureCollection(db);
    await db.collection(COLLECTION).add({
      declaration_text: text,
      card_name: name,
      card_style: style,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[gallery] POST failed:", e);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
}
