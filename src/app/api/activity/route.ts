import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(await cookies());
    void session;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");

    const db = getDb();

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (entityType) {
      conditions.push("al.entity_type = ?");
      params.push(entityType);
    }

    if (entityId) {
      conditions.push("al.entity_id = ?");
      params.push(entityId);
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const rows = db
      .prepare(
        `SELECT al.*, u.name AS user_name
         FROM activity_log al
         LEFT JOIN users u ON u.id = al.user_id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT ?`
      )
      .all(...params, limit);

    return NextResponse.json(rows);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
