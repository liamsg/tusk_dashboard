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

    const meetingNote = db
      .prepare("SELECT * FROM meeting_notes WHERE id = ?")
      .get(id);
    if (!meetingNote) {
      return NextResponse.json(
        { error: "Meeting note not found" },
        { status: 404 }
      );
    }

    const attendees = db
      .prepare(
        `SELECT p.*
         FROM people p
         JOIN meeting_note_people mnp ON mnp.person_id = p.id
         WHERE mnp.meeting_note_id = ?`
      )
      .all(id);

    const linkedCards = db
      .prepare(
        `SELECT c.*
         FROM cards c
         JOIN card_meeting_notes cmn ON cmn.card_id = c.id
         WHERE cmn.meeting_note_id = ?`
      )
      .all(id);

    const linkedTodos = db
      .prepare(
        `SELECT t.*
         FROM todos t
         JOIN meeting_note_todos mnt ON mnt.todo_id = t.id
         WHERE mnt.meeting_note_id = ?`
      )
      .all(id);

    const linkedPeople = db
      .prepare(
        `SELECT p.id, p.name, p.role, o.name AS organisation_name
         FROM people p
         JOIN meeting_note_people mnp ON mnp.person_id = p.id
         LEFT JOIN organisations o ON o.id = p.organisation_id
         WHERE mnp.meeting_note_id = ? AND p.archived = 0`
      )
      .all(id);

    const notes = db
      .prepare(
        `SELECT n.*, u.name AS creator_name
         FROM notes n
         LEFT JOIN users u ON u.id = n.created_by
         WHERE n.entity_type = 'meeting_note' AND n.entity_id = ? AND n.archived = 0
         ORDER BY n.created_at DESC`
      )
      .all(id);

    const refs = db
      .prepare(
        `SELECT r.id, r.ref_type, r.title, r.date
         FROM refs r
         JOIN ref_entities re ON re.ref_id = r.id
         WHERE re.entity_type = 'meeting_note' AND re.entity_id = ? AND r.archived = 0
         ORDER BY r.date DESC, r.created_at DESC`
      )
      .all(id);

    const activity = db
      .prepare(
        `SELECT al.id, al.description, u.name AS user_name, al.created_at
         FROM activity_log al
         LEFT JOIN users u ON u.id = al.user_id
         WHERE al.entity_type = 'meeting_note' AND al.entity_id = ?
         ORDER BY al.created_at DESC`
      )
      .all(id);

    return NextResponse.json({
      ...meetingNote,
      attendees,
      linked_cards: linkedCards,
      linked_todos: linkedTodos,
      linked_people: linkedPeople,
      notes,
      refs,
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

    const existing = db
      .prepare("SELECT * FROM meeting_notes WHERE id = ?")
      .get(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Meeting note not found" },
        { status: 404 }
      );
    }

    const updatableFields = ["title", "date", "content", "tags"] as const;

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
        `UPDATE meeting_notes SET ${setClauses.join(", ")} WHERE id = ?`
      ).run(...setParams, id);

      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "updated",
        "meeting_note",
        id,
        session.userId,
        `Updated meeting note`,
        now
      );
    }

    // Handle linking
    if (body.link_card_id) {
      db.prepare(
        "INSERT OR IGNORE INTO card_meeting_notes (card_id, meeting_note_id) VALUES (?, ?)"
      ).run(body.link_card_id, id);

      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "linked",
        "meeting_note",
        id,
        session.userId,
        `Linked card to meeting note`,
        now
      );
    }

    if (body.link_todo_id) {
      db.prepare(
        "INSERT OR IGNORE INTO meeting_note_todos (meeting_note_id, todo_id) VALUES (?, ?)"
      ).run(id, body.link_todo_id);

      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "linked",
        "meeting_note",
        id,
        session.userId,
        `Linked todo to meeting note`,
        now
      );
    }

    if (body.link_person_id) {
      db.prepare(
        "INSERT OR IGNORE INTO meeting_note_people (meeting_note_id, person_id) VALUES (?, ?)"
      ).run(id, body.link_person_id);

      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "linked",
        "meeting_note",
        id,
        session.userId,
        `Linked person to meeting note`,
        now
      );
    }

    const updated = db
      .prepare("SELECT * FROM meeting_notes WHERE id = ?")
      .get(id);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
