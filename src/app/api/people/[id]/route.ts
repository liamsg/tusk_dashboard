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

    const person = db.prepare("SELECT * FROM people WHERE id = ?").get(id);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json(person);
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

    const existing = db.prepare("SELECT * FROM people WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const updatableFields = [
      "name",
      "organisation_id",
      "role",
      "relationship",
      "email",
      "phone",
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
        `UPDATE people SET ${setClauses.join(", ")} WHERE id = ?`
      ).run(...setParams, id);

      const personName = (db.prepare("SELECT name FROM people WHERE id = ?").get(id) as { name: string } | undefined)?.name || id;
      const logId = crypto.randomUUID();
      const description = body.archived
        ? `Archived ${personName}`
        : `Updated ${personName}`;
      db.prepare(
        `INSERT INTO activity_log (id, action, entity_type, entity_id, user_id, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(logId, "updated", "person", id, session.userId, description, now);
    }

    const updated = db.prepare("SELECT * FROM people WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
