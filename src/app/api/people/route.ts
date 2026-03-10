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
    const organisationId = searchParams.get("organisation_id");

    const db = getDb();

    const conditions: string[] = ["p.archived = 0"];
    const params: unknown[] = [];

    if (organisationId) {
      conditions.push("p.organisation_id = ?");
      params.push(organisationId);
    }

    const whereClause = "WHERE " + conditions.join(" AND ");

    const rows = db
      .prepare(
        `SELECT p.*, o.name AS organisation_name
         FROM people p
         LEFT JOIN organisations o ON o.id = p.organisation_id
         ${whereClause}
         ORDER BY p.name ASC`
      )
      .all(...params);

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
    const { name, organisation_id, role, relationship, email, phone } =
      body as {
        name?: string;
        organisation_id?: string;
        role?: string;
        relationship?: string;
        email?: string;
        phone?: string;
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
      `INSERT INTO people (id, name, organisation_id, role, relationship, email, phone, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      name,
      organisation_id || null,
      role || null,
      relationship || null,
      email || null,
      phone || null,
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
      "person",
      id,
      session.userId,
      `Created person "${name}"`,
      now
    );

    const created = db.prepare("SELECT * FROM people WHERE id = ?").get(id);

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
