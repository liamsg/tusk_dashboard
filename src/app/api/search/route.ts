import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(await cookies());
    void session;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { error: "q query parameter is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const pattern = `%${q}%`;

    const cards = db
      .prepare(
        `SELECT id, title, summary, status, 'card' AS type
         FROM cards
         WHERE archived = 0 AND (title LIKE ? OR summary LIKE ?)
         LIMIT 5`
      )
      .all(pattern, pattern);

    const todos = db
      .prepare(
        `SELECT id, title, description, status, 'todo' AS type
         FROM todos
         WHERE archived = 0 AND (title LIKE ? OR description LIKE ?)
         LIMIT 5`
      )
      .all(pattern, pattern);

    const people = db
      .prepare(
        `SELECT id, name, email, role, 'person' AS type
         FROM people
         WHERE archived = 0 AND (name LIKE ? OR email LIKE ? OR role LIKE ?)
         LIMIT 5`
      )
      .all(pattern, pattern, pattern);

    const organisations = db
      .prepare(
        `SELECT id, name, summary, 'organisation' AS type
         FROM organisations
         WHERE archived = 0 AND (name LIKE ? OR summary LIKE ?)
         LIMIT 5`
      )
      .all(pattern, pattern);

    const meetingNotes = db
      .prepare(
        `SELECT id, title, date, 'meeting_note' AS type
         FROM meeting_notes
         WHERE archived = 0 AND (title LIKE ? OR content LIKE ?)
         LIMIT 5`
      )
      .all(pattern, pattern);

    const refs = db
      .prepare(
        `SELECT id, title, ref_type, date, 'ref' AS type
         FROM refs
         WHERE archived = 0 AND (title LIKE ? OR detail LIKE ?)
         LIMIT 5`
      )
      .all(pattern, pattern);

    const notes = db
      .prepare(
        `SELECT id, content, entity_type, entity_id, 'note' AS type
         FROM notes
         WHERE archived = 0 AND content LIKE ?
         LIMIT 5`
      )
      .all(pattern);

    return NextResponse.json({
      cards,
      todos,
      people,
      organisations,
      meeting_notes: meetingNotes,
      refs,
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
