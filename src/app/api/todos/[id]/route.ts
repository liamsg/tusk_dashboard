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

    const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
    if (!todo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const linkedCards = db
      .prepare(
        `SELECT c.*
         FROM cards c
         JOIN card_todos ct ON ct.card_id = c.id
         WHERE ct.todo_id = ?`
      )
      .all(id);

    const linkedPeople = db
      .prepare(
        `SELECT p.*
         FROM people p
         JOIN todo_people tp ON tp.person_id = p.id
         WHERE tp.todo_id = ?`
      )
      .all(id);

    const linkedRefs = db
      .prepare(
        `SELECT r.*
         FROM refs r
         JOIN todo_refs tr ON tr.ref_id = r.id
         WHERE tr.todo_id = ?`
      )
      .all(id);

    const notes = db
      .prepare(
        `SELECT n.*, u.name AS creator_name
         FROM notes n
         LEFT JOIN users u ON u.id = n.created_by
         WHERE n.entity_type = 'todo' AND n.entity_id = ? AND n.archived = 0
         ORDER BY n.created_at DESC`
      )
      .all(id);

    return NextResponse.json({
      ...todo,
      linked_cards: linkedCards,
      linked_people: linkedPeople,
      linked_refs: linkedRefs,
      notes,
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

    const existing = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const updatableFields = [
      "title",
      "description",
      "assigned_to",
      "due_date",
      "ball_in_court",
      "ball_in_court_person_id",
      "status",
      "sort_order",
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
        `UPDATE todos SET ${setClauses.join(", ")} WHERE id = ?`
      ).run(...setParams, id);

      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "updated",
        "todo",
        id,
        session.userId,
        `Updated todo fields`,
        now
      );
    }

    // Handle linking
    if (body.link_person_id) {
      db.prepare(
        "INSERT OR IGNORE INTO todo_people (todo_id, person_id) VALUES (?, ?)"
      ).run(id, body.link_person_id);

      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "linked",
        "todo",
        id,
        session.userId,
        `Linked person to todo`,
        now
      );
    }

    if (body.link_card_id) {
      db.prepare(
        "INSERT OR IGNORE INTO card_todos (card_id, todo_id) VALUES (?, ?)"
      ).run(body.link_card_id, id);

      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "linked",
        "todo",
        id,
        session.userId,
        `Linked card to todo`,
        now
      );
    }

    if (body.link_ref_id) {
      db.prepare(
        "INSERT OR IGNORE INTO todo_refs (todo_id, ref_id) VALUES (?, ?)"
      ).run(id, body.link_ref_id);

      const logId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        logId,
        "linked",
        "todo",
        id,
        session.userId,
        `Linked reference to todo`,
        now
      );
    }

    const updated = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
