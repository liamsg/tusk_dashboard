import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

interface RefRow {
  id: string;
  ref_type: string;
  title: string;
  date: string | null;
  detail: string | null;
  created_by: string | null;
  created_at: string;
  archived: number;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = requireSession(await cookies());
    void session;

    const { id } = await context.params;
    const db = getDb();

    const ref = db.prepare("SELECT * FROM refs WHERE id = ?").get(id) as RefRow | undefined;
    if (!ref) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    // Creator name
    let creatorName: string | null = null;
    if (ref.created_by) {
      const creator = db
        .prepare("SELECT name FROM users WHERE id = ?")
        .get(ref.created_by) as { name: string } | undefined;
      creatorName = creator?.name ?? null;
    }

    // Linked cards
    const linkedCards = db
      .prepare(
        `SELECT DISTINCT c.id, c.title FROM cards c
         LEFT JOIN card_refs cr ON cr.card_id = c.id AND cr.ref_id = ?
         LEFT JOIN ref_entities re ON re.entity_type = 'card' AND re.entity_id = c.id AND re.ref_id = ?
         WHERE (cr.ref_id IS NOT NULL OR re.ref_id IS NOT NULL) AND c.archived = 0`
      )
      .all(id, id);

    // Linked todos
    const linkedTodos = db
      .prepare(
        `SELECT DISTINCT t.id, t.title, t.status FROM todos t
         LEFT JOIN todo_refs tr ON tr.todo_id = t.id AND tr.ref_id = ?
         LEFT JOIN ref_entities re ON re.entity_type = 'todo' AND re.entity_id = t.id AND re.ref_id = ?
         WHERE (tr.ref_id IS NOT NULL OR re.ref_id IS NOT NULL) AND t.archived = 0`
      )
      .all(id, id);

    // Linked people
    const linkedPeople = db
      .prepare(
        `SELECT p.id, p.name FROM people p
         JOIN ref_entities re ON re.entity_type = 'person' AND re.entity_id = p.id
         WHERE re.ref_id = ? AND p.archived = 0`
      )
      .all(id);

    // Linked meeting notes
    const linkedMeetingNotes = db
      .prepare(
        `SELECT mn.id, mn.title, mn.date FROM meeting_notes mn
         JOIN ref_entities re ON re.entity_type = 'meeting_note' AND re.entity_id = mn.id
         WHERE re.ref_id = ? AND mn.archived = 0
         ORDER BY mn.date DESC`
      )
      .all(id);

    return NextResponse.json({
      ...ref,
      creator_name: creatorName,
      linked_cards: linkedCards,
      linked_todos: linkedTodos,
      linked_people: linkedPeople,
      linked_meeting_notes: linkedMeetingNotes,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = requireSession(await cookies());
    const { id } = await context.params;
    const body = await request.json();
    const db = getDb();
    const now = new Date().toISOString();

    const existing = db.prepare("SELECT * FROM refs WHERE id = ?").get(id) as RefRow | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    const updatableFields = ["title", "detail", "date", "ref_type"] as const;

    const setClauses: string[] = [];
    const setParams: unknown[] = [];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        setParams.push(body[field]);
      }
    }

    if (body.archived !== undefined) {
      setClauses.push("archived = ?");
      setParams.push(body.archived ? 1 : 0);
      if (body.archived) {
        setClauses.push("archived_by = ?");
        setParams.push(session.userId);
        setClauses.push("archived_at = ?");
        setParams.push(now);
      } else {
        setClauses.push("archived_by = NULL");
        setClauses.push("archived_at = NULL");
      }
    }

    if (setClauses.length > 0) {
      db.prepare(
        `UPDATE refs SET ${setClauses.join(", ")} WHERE id = ?`
      ).run(...setParams, id);

      const logId = crypto.randomUUID();
      const description = body.archived
        ? `Archived reference '${existing.title}'`
        : `Updated reference '${existing.title}'`;
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(logId, "updated", "ref", id, session.userId, description, now);
    }

    const updated = db.prepare("SELECT * FROM refs WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
