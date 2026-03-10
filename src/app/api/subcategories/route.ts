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
    const categoryId = searchParams.get("category_id");

    if (!categoryId) {
      return NextResponse.json(
        { error: "category_id query parameter is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const rows = db
      .prepare(
        `SELECT sc.*,
                (SELECT COUNT(*) FROM cards
                 WHERE cards.subcategory_id = sc.id AND cards.archived = 0) AS card_count
         FROM subcategories sc
         WHERE sc.category_id = ? AND sc.archived = 0
         ORDER BY sc.sort_order ASC`
      )
      .all(categoryId);

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
    const { category_id, name } = body as {
      category_id?: string;
      name?: string;
    };

    if (!category_id || !name) {
      return NextResponse.json(
        { error: "category_id and name are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const maxOrder = db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM subcategories WHERE category_id = ?"
      )
      .get(category_id) as { max_order: number };

    db.prepare(
      `INSERT INTO subcategories (id, category_id, name, sort_order, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, category_id, name, maxOrder.max_order + 1, session.userId, now);

    const logId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      logId,
      "created",
      "subcategory",
      id,
      session.userId,
      `Created subcategory "${name}"`,
      now
    );

    const created = db
      .prepare("SELECT * FROM subcategories WHERE id = ?")
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
