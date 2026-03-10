import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(await cookies());
    void session;

    const { searchParams } = new URL(request.url);
    const workstreamId = searchParams.get("workstream_id");

    if (!workstreamId) {
      return NextResponse.json(
        { error: "workstream_id query parameter is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const rows = db
      .prepare(
        `SELECT c.*,
                (SELECT COUNT(*) FROM cards
                 WHERE cards.category_id = c.id AND cards.archived = 0) AS card_count
         FROM categories c
         WHERE c.workstream_id = ? AND c.archived = 0
         ORDER BY c.sort_order ASC`
      )
      .all(workstreamId);

    return NextResponse.json(rows);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(await cookies());
    const body = await request.json();
    const { workstream_id, name } = body as {
      workstream_id?: string;
      name?: string;
    };

    if (!workstream_id || !name) {
      return NextResponse.json(
        { error: "workstream_id and name are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const maxOrder = db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM categories WHERE workstream_id = ?"
      )
      .get(workstream_id) as { max_order: number };

    db.prepare(
      `INSERT INTO categories (id, workstream_id, name, sort_order, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, workstream_id, name, maxOrder.max_order + 1, session.userId, now);

    const logId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      logId,
      "created",
      "category",
      id,
      session.userId,
      `Created category "${name}"`,
      now
    );

    const created = db
      .prepare("SELECT * FROM categories WHERE id = ?")
      .get(id);

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
