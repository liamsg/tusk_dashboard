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
        "SELECT * FROM milestones ORDER BY target_date ASC"
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
    const { title, target_date, description, status, workstream_id } =
      body as {
        title?: string;
        target_date?: string;
        description?: string;
        status?: string;
        workstream_id?: string;
      };

    if (!title || !target_date) {
      return NextResponse.json(
        { error: "title and target_date are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO milestones (id, title, target_date, description, status, workstream_id, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      title,
      target_date,
      description || null,
      status || "upcoming",
      workstream_id || null,
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
      "milestone",
      id,
      session.userId,
      `Created milestone "${title}"`,
      now
    );

    const created = db
      .prepare("SELECT * FROM milestones WHERE id = ?")
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
