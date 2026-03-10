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
        `SELECT o.*,
                (SELECT COUNT(*) FROM people WHERE people.organisation_id = o.id AND people.archived = 0) AS people_count,
                (SELECT COUNT(*) FROM org_cards WHERE org_cards.organisation_id = o.id) AS card_count
         FROM organisations o
         WHERE o.archived = 0
         ORDER BY o.name ASC`
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
    const { name, website, summary, org_type } = body as {
      name?: string;
      website?: string;
      summary?: string;
      org_type?: string;
    };

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO organisations (id, name, website, summary, org_type, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      name,
      website || null,
      summary || null,
      org_type || null,
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
      "organisation",
      id,
      session.userId,
      `Created organisation "${name}"`,
      now
    );

    const created = db
      .prepare("SELECT * FROM organisations WHERE id = ?")
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
