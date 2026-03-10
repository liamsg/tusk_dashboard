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
    const assignedTo = searchParams.get("assigned_to");
    const status = searchParams.get("status");
    const cardId = searchParams.get("card_id");
    const archived = searchParams.get("archived") === "true";

    const db = getDb();

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (archived) {
      conditions.push("t.archived = 1");
    } else {
      conditions.push("t.archived = 0");
    }

    if (assignedTo) {
      conditions.push("t.assigned_to = ?");
      params.push(assignedTo);
    }

    if (status) {
      conditions.push("t.status = ?");
      params.push(status);
    }

    if (cardId) {
      conditions.push(
        "t.id IN (SELECT todo_id FROM card_todos WHERE card_id = ?)"
      );
      params.push(cardId);
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const rows = db
      .prepare(
        `SELECT t.*,
                (SELECT COUNT(*) FROM notes
                 WHERE notes.entity_type = 'todo' AND notes.entity_id = t.id AND notes.archived = 0) AS note_count
         FROM todos t
         ${whereClause}
         ORDER BY t.sort_order ASC`
      )
      .all(...params);

    // Enrich with linked cards and people
    const enriched = rows.map((row: unknown) => {
      const todo = row as Record<string, unknown>;
      const linkedCards = db
        .prepare(
          `SELECT c.id, c.title
           FROM cards c
           JOIN card_todos ct ON ct.card_id = c.id
           WHERE ct.todo_id = ?`
        )
        .all(todo.id as string);

      const linkedPeople = db
        .prepare(
          `SELECT p.id, p.name, p.email
           FROM people p
           JOIN todo_people tp ON tp.person_id = p.id
           WHERE tp.todo_id = ?`
        )
        .all(todo.id as string);

      return { ...todo, linked_cards: linkedCards, linked_people: linkedPeople };
    });

    return NextResponse.json(enriched);
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
      description,
      assigned_to,
      due_date,
      ball_in_court,
      ball_in_court_person_id,
      card_id,
    } = body as {
      title?: string;
      description?: string;
      assigned_to?: string;
      due_date?: string;
      ball_in_court?: string;
      ball_in_court_person_id?: string;
      card_id?: string;
    };

    if (!title || !assigned_to) {
      return NextResponse.json(
        { error: "title and assigned_to are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const maxOrder = db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM todos"
      )
      .get() as { max_order: number };

    db.prepare(
      `INSERT INTO todos (id, title, description, assigned_to, due_date, ball_in_court, ball_in_court_person_id, sort_order, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      title,
      description || null,
      assigned_to,
      due_date || null,
      ball_in_court || "us",
      ball_in_court_person_id || null,
      maxOrder.max_order + 1,
      session.userId,
      now
    );

    if (card_id) {
      db.prepare(
        "INSERT OR IGNORE INTO card_todos (card_id, todo_id) VALUES (?, ?)"
      ).run(card_id, id);
    }

    const logId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      logId,
      "created",
      "todo",
      id,
      session.userId,
      `Created todo "${title}"`,
      now
    );

    const created = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
