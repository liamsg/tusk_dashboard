import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = requireSession(await cookies());
    void session;

    const { id } = await context.params;
    const db = getDb();

    const card = db.prepare("SELECT * FROM cards WHERE id = ?").get(id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const people = db
      .prepare(
        `SELECT p.*, o.name AS organisation_name
         FROM people p
         JOIN card_people cp ON cp.person_id = p.id
         LEFT JOIN organisations o ON o.id = p.organisation_id
         WHERE cp.card_id = ? AND p.archived = 0`
      )
      .all(id);

    const todos = db
      .prepare(
        `SELECT t.*
         FROM todos t
         JOIN card_todos ct ON ct.todo_id = t.id
         WHERE ct.card_id = ? AND t.archived = 0`
      )
      .all(id);

    const references = db
      .prepare(
        `SELECT r.*
         FROM refs r
         JOIN card_refs cr ON cr.ref_id = r.id
         WHERE cr.card_id = ? AND r.archived = 0`
      )
      .all(id);

    const notes = db
      .prepare(
        `SELECT n.*, u.name AS creator_name
         FROM notes n
         LEFT JOIN users u ON u.id = n.created_by
         WHERE n.entity_type = 'card' AND n.entity_id = ? AND n.archived = 0
         ORDER BY n.created_at DESC`
      )
      .all(id);

    const meetingNotes = db
      .prepare(
        `SELECT mn.*
         FROM meeting_notes mn
         JOIN card_meeting_notes cmn ON cmn.meeting_note_id = mn.id
         WHERE cmn.card_id = ? AND mn.archived = 0
         ORDER BY mn.date DESC`
      )
      .all(id);

    const activity = db
      .prepare(
        `SELECT al.*, u.name AS user_name
         FROM activity_log al
         LEFT JOIN users u ON u.id = al.user_id
         WHERE al.entity_type = 'card' AND al.entity_id = ?
         ORDER BY al.created_at DESC`
      )
      .all(id);

    return NextResponse.json({
      ...card,
      people,
      todos,
      references,
      notes,
      meeting_notes: meetingNotes,
      activity,
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

    const existing = db.prepare("SELECT * FROM cards WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Handle field updates
    const updatableFields = [
      "title",
      "summary",
      "status",
      "category_id",
      "subcategory_id",
      "flagged_for_discussion",
    ] as const;

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
      setClauses.push("updated_by = ?");
      setParams.push(session.userId);
      setClauses.push("updated_at = ?");
      setParams.push(now);

      db.prepare(
        `UPDATE cards SET ${setClauses.join(", ")} WHERE id = ?`
      ).run(...setParams, id);

      const cardTitle = (db.prepare("SELECT title FROM cards WHERE id = ?").get(id) as { title: string } | undefined)?.title || id;
      const logId = crypto.randomUUID();
      const description = body.archived
        ? `Archived '${cardTitle}'`
        : `Updated '${cardTitle}'`;
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(logId, "updated", "card", id, session.userId, description, now);
    }

    // Handle linking
    if (body.link_person_id) {
      db.prepare(
        "INSERT OR IGNORE INTO card_people (card_id, person_id) VALUES (?, ?)"
      ).run(id, body.link_person_id);

      const person = db.prepare("SELECT name FROM people WHERE id = ?").get(body.link_person_id) as { name: string } | undefined;
      const card = db.prepare("SELECT title FROM cards WHERE id = ?").get(id) as { title: string } | undefined;
      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "linked",
        "card",
        id,
        session.userId,
        `Linked person '${person?.name || 'person'}' to card '${card?.title || 'card'}'`,
        now
      );
    }

    if (body.link_todo_id) {
      db.prepare(
        "INSERT OR IGNORE INTO card_todos (card_id, todo_id) VALUES (?, ?)"
      ).run(id, body.link_todo_id);

      const todo = db.prepare("SELECT title FROM todos WHERE id = ?").get(body.link_todo_id) as { title: string } | undefined;
      const card = db.prepare("SELECT title FROM cards WHERE id = ?").get(id) as { title: string } | undefined;
      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "linked",
        "card",
        id,
        session.userId,
        `Linked todo '${todo?.title || 'todo'}' to card '${card?.title || 'card'}'`,
        now
      );
    }

    if (body.link_ref_id) {
      db.prepare(
        "INSERT OR IGNORE INTO card_refs (card_id, ref_id) VALUES (?, ?)"
      ).run(id, body.link_ref_id);

      const ref = db.prepare("SELECT title FROM refs WHERE id = ?").get(body.link_ref_id) as { title: string } | undefined;
      const card = db.prepare("SELECT title FROM cards WHERE id = ?").get(id) as { title: string } | undefined;
      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "linked",
        "card",
        id,
        session.userId,
        `Linked reference '${ref?.title || 'reference'}' to card '${card?.title || 'card'}'`,
        now
      );
    }

    if (body.link_meeting_note_id) {
      db.prepare(
        "INSERT OR IGNORE INTO card_meeting_notes (card_id, meeting_note_id) VALUES (?, ?)"
      ).run(id, body.link_meeting_note_id);

      const mn = db.prepare("SELECT title FROM meeting_notes WHERE id = ?").get(body.link_meeting_note_id) as { title: string } | undefined;
      const card = db.prepare("SELECT title FROM cards WHERE id = ?").get(id) as { title: string } | undefined;
      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "linked",
        "card",
        id,
        session.userId,
        `Linked meeting note '${mn?.title || 'meeting note'}' to card '${card?.title || 'card'}'`,
        now
      );
    }

    const updated = db.prepare("SELECT * FROM cards WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
