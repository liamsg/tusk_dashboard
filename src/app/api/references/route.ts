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
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");

    const db = getDb();

    if (entityType && entityId) {
      const rows = db
        .prepare(
          `SELECT r.*,
                  (SELECT COUNT(*) FROM ref_entities WHERE ref_entities.ref_id = r.id) AS linked_entity_count
           FROM refs r
           JOIN ref_entities re ON re.ref_id = r.id
           WHERE re.entity_type = ? AND re.entity_id = ? AND r.archived = 0
           ORDER BY r.created_at DESC`
        )
        .all(entityType, entityId);

      return NextResponse.json(rows);
    }

    const rows = db
      .prepare(
        `SELECT r.*,
                (SELECT COUNT(*) FROM ref_entities WHERE ref_entities.ref_id = r.id) AS linked_entity_count
         FROM refs r
         WHERE r.archived = 0
         ORDER BY r.created_at DESC`
      )
      .all();

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
    const { ref_type, title, date, detail, entity_type, entity_id } = body as {
      ref_type?: string;
      title?: string;
      date?: string;
      detail?: string;
      entity_type?: string;
      entity_id?: string;
    };

    if (!ref_type || !title || !detail) {
      return NextResponse.json(
        { error: "ref_type, title, and detail are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO refs (id, ref_type, title, date, detail, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, ref_type, title, date || null, detail, session.userId, now);

    // Auto-link to entity if provided
    if (entity_type && entity_id) {
      db.prepare(
        "INSERT INTO ref_entities (ref_id, entity_type, entity_id) VALUES (?, ?, ?)"
      ).run(id, entity_type, entity_id);

      // Also insert into the specific junction table so refs appear on detail pages
      if (entity_type === "card") {
        db.prepare(
          "INSERT OR IGNORE INTO card_refs (card_id, ref_id) VALUES (?, ?)"
        ).run(entity_id, id);
      } else if (entity_type === "todo") {
        db.prepare(
          "INSERT OR IGNORE INTO todo_refs (todo_id, ref_id) VALUES (?, ?)"
        ).run(entity_id, id);
      }
    }

    const logId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      logId,
      "created",
      "ref",
      id,
      session.userId,
      `Created reference "${title}"`,
      now
    );

    const created = db.prepare("SELECT * FROM refs WHERE id = ?").get(id);

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
