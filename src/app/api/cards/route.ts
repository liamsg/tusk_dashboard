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
    const subcategoryId = searchParams.get("subcategory_id");
    const workstreamId = searchParams.get("workstream_id");
    const archived = searchParams.get("archived") === "true";
    const search = searchParams.get("search");

    const db = getDb();

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (archived) {
      conditions.push("c.archived = 1");
    } else {
      conditions.push("c.archived = 0");
    }

    if (categoryId) {
      conditions.push("c.category_id = ?");
      params.push(categoryId);
    }

    if (subcategoryId) {
      conditions.push("c.subcategory_id = ?");
      params.push(subcategoryId);
    }

    if (workstreamId) {
      conditions.push(
        "(c.category_id IN (SELECT id FROM categories WHERE workstream_id = ?))"
      );
      params.push(workstreamId);
    }

    if (search) {
      conditions.push("(c.title LIKE ? OR c.summary LIKE ?)");
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const rows = db
      .prepare(
        `SELECT c.*,
                (SELECT COUNT(*) FROM card_people WHERE card_people.card_id = c.id) AS people_count,
                (SELECT COUNT(*) FROM card_todos WHERE card_todos.card_id = c.id) AS todo_count,
                (SELECT COUNT(*) FROM notes WHERE notes.entity_type = 'card' AND notes.entity_id = c.id AND notes.archived = 0) AS note_count
         FROM cards c
         ${whereClause}
         ORDER BY c.created_at DESC`
      )
      .all(...params);

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
    const {
      title,
      summary,
      category_id,
      subcategory_id,
      status,
      organisation_id,
    } = body as {
      title?: string;
      summary?: string;
      category_id?: string;
      subcategory_id?: string;
      status?: string;
      organisation_id?: string;
    };

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const cardStatus = status || "new";

    db.prepare(
      `INSERT INTO cards (id, title, summary, category_id, subcategory_id, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      title,
      summary || null,
      category_id || null,
      subcategory_id || null,
      cardStatus,
      session.userId,
      now
    );

    if (organisation_id) {
      db.prepare(
        "INSERT INTO org_cards (organisation_id, card_id) VALUES (?, ?)"
      ).run(organisation_id, id);
    }

    const logId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      logId,
      "created",
      "card",
      id,
      session.userId,
      `Created card "${title}"`,
      now
    );

    const created = db.prepare("SELECT * FROM cards WHERE id = ?").get(id);

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
