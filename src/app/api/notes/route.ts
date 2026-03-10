import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const VALID_ENTITY_TYPES = [
  "card",
  "todo",
  "person",
  "organisation",
  "category",
  "subcategory",
  "workstream",
  "meeting_note",
] as const;

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(await cookies());
    void session;

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entity_type and entity_id query parameters are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const rows = db
      .prepare(
        `SELECT n.*, u.name AS creator_name
         FROM notes n
         LEFT JOIN users u ON u.id = n.created_by
         WHERE n.entity_type = ? AND n.entity_id = ? AND n.archived = 0
         ORDER BY n.created_at DESC`
      )
      .all(entityType, entityId);

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
    const { content, entity_type, entity_id, reference_id } = body as {
      content?: string;
      entity_type?: string;
      entity_id?: string;
      reference_id?: string;
    };

    if (!content || !entity_type || !entity_id) {
      return NextResponse.json(
        { error: "content, entity_type, and entity_id are required" },
        { status: 400 }
      );
    }

    if (
      !VALID_ENTITY_TYPES.includes(
        entity_type as (typeof VALID_ENTITY_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        { error: `Invalid entity_type. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO notes (id, content, entity_type, entity_id, reference_id, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      content,
      entity_type,
      entity_id,
      reference_id || null,
      session.userId,
      now
    );

    const logId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      logId,
      "created",
      "note",
      id,
      session.userId,
      `Added note to ${entity_type}`,
      now
    );

    const created = db.prepare("SELECT * FROM notes WHERE id = ?").get(id);

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
