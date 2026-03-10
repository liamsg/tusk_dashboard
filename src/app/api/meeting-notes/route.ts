import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = requireSession(await cookies());
    void session;

    const db = getDb();
    const rows = db
      .prepare(
        `SELECT mn.*
         FROM meeting_notes mn
         WHERE mn.archived = 0
         ORDER BY mn.date DESC`
      )
      .all();

    // Enrich with attendee names
    const enriched = rows.map((row: unknown) => {
      const note = row as Record<string, unknown>;
      const attendees = db
        .prepare(
          `SELECT p.id, p.name
           FROM people p
           JOIN meeting_note_people mnp ON mnp.person_id = p.id
           WHERE mnp.meeting_note_id = ?`
        )
        .all(note.id as string);

      return { ...note, attendees };
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
    const { title, date, content, tags, attendee_ids } = body as {
      title?: string;
      date?: string;
      content?: string;
      tags?: string;
      attendee_ids?: string[];
    };

    if (!title || !content) {
      return NextResponse.json(
        { error: "title and content are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const meetingDate = date || now.split("T")[0];

    db.prepare(
      `INSERT INTO meeting_notes (id, title, date, content, recorded_by, tags, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      title,
      meetingDate,
      content,
      session.userId,
      tags || null,
      session.userId,
      now
    );

    // Link attendees (people IDs)
    if (attendee_ids && attendee_ids.length > 0) {
      const insertAttendee = db.prepare(
        "INSERT OR IGNORE INTO meeting_note_people (meeting_note_id, person_id) VALUES (?, ?)"
      );
      for (const attendeeId of attendee_ids) {
        // Only insert if this is a valid person ID
        const person = db
          .prepare("SELECT id FROM people WHERE id = ?")
          .get(attendeeId);
        if (person) {
          insertAttendee.run(id, attendeeId);
        }
      }
    }

    const logId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      logId,
      "created",
      "meeting_note",
      id,
      session.userId,
      `Created meeting note "${title}"`,
      now
    );

    const created = db
      .prepare("SELECT * FROM meeting_notes WHERE id = ?")
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
