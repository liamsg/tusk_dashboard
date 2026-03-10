import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ArchiveFilter } from "./ArchiveFilter";

// -- Types --------------------------------------------------------------------

interface ArchivedItem {
  id: string;
  name: string;
  entityType: string;
  entityLabel: string;
  apiPath: string;
  archivedBy: string | null;
  archivedAt: string | null;
}

interface ArchivedRow {
  id: string;
  name: string;
  archived_by: string | null;
  archived_at: string | null;
}

// -- Helpers ------------------------------------------------------------------

function formatShortDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// -- Page ---------------------------------------------------------------------

export default async function ArchivePage() {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  void session;

  const db = getDb();

  // Build a map of user IDs to names for display
  const users = db
    .prepare("SELECT id, name FROM users")
    .all() as { id: string; name: string }[];
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const items: ArchivedItem[] = [];

  // Cards
  const archivedCards = db
    .prepare(
      `SELECT id, title AS name, archived_by, archived_at
       FROM cards WHERE archived = 1
       ORDER BY archived_at DESC`
    )
    .all() as ArchivedRow[];
  for (const row of archivedCards) {
    items.push({
      id: row.id,
      name: row.name,
      entityType: "card",
      entityLabel: "card",
      apiPath: `/api/cards/${row.id}`,
      archivedBy: row.archived_by ? userMap.get(row.archived_by) || null : null,
      archivedAt: row.archived_at ? formatShortDate(row.archived_at) : null,
    });
  }

  // Todos
  const archivedTodos = db
    .prepare(
      `SELECT id, title AS name, archived_by, archived_at
       FROM todos WHERE archived = 1
       ORDER BY archived_at DESC`
    )
    .all() as ArchivedRow[];
  for (const row of archivedTodos) {
    items.push({
      id: row.id,
      name: row.name,
      entityType: "todo",
      entityLabel: "to-do",
      apiPath: `/api/todos/${row.id}`,
      archivedBy: row.archived_by ? userMap.get(row.archived_by) || null : null,
      archivedAt: row.archived_at ? formatShortDate(row.archived_at) : null,
    });
  }

  // People
  const archivedPeople = db
    .prepare(
      `SELECT id, name, archived_by, archived_at
       FROM people WHERE archived = 1
       ORDER BY archived_at DESC`
    )
    .all() as ArchivedRow[];
  for (const row of archivedPeople) {
    items.push({
      id: row.id,
      name: row.name,
      entityType: "person",
      entityLabel: "person",
      apiPath: `/api/people/${row.id}`,
      archivedBy: row.archived_by ? userMap.get(row.archived_by) || null : null,
      archivedAt: row.archived_at ? formatShortDate(row.archived_at) : null,
    });
  }

  // Organisations
  const archivedOrgs = db
    .prepare(
      `SELECT id, name, archived_by, archived_at
       FROM organisations WHERE archived = 1
       ORDER BY archived_at DESC`
    )
    .all() as ArchivedRow[];
  for (const row of archivedOrgs) {
    items.push({
      id: row.id,
      name: row.name,
      entityType: "organisation",
      entityLabel: "organisation",
      apiPath: `/api/organisations/${row.id}`,
      archivedBy: row.archived_by ? userMap.get(row.archived_by) || null : null,
      archivedAt: row.archived_at ? formatShortDate(row.archived_at) : null,
    });
  }

  // Meeting Notes
  const archivedMeetingNotes = db
    .prepare(
      `SELECT id, title AS name, archived_by, archived_at
       FROM meeting_notes WHERE archived = 1
       ORDER BY archived_at DESC`
    )
    .all() as ArchivedRow[];
  for (const row of archivedMeetingNotes) {
    items.push({
      id: row.id,
      name: row.name,
      entityType: "meeting_note",
      entityLabel: "meeting note",
      apiPath: `/api/meeting-notes/${row.id}`,
      archivedBy: row.archived_by ? userMap.get(row.archived_by) || null : null,
      archivedAt: row.archived_at ? formatShortDate(row.archived_at) : null,
    });
  }

  // Categories
  const archivedCategories = db
    .prepare(
      `SELECT id, name, archived_by, archived_at
       FROM categories WHERE archived = 1
       ORDER BY archived_at DESC`
    )
    .all() as ArchivedRow[];
  for (const row of archivedCategories) {
    items.push({
      id: row.id,
      name: row.name,
      entityType: "category",
      entityLabel: "category",
      apiPath: `/api/categories/${row.id}`,
      archivedBy: row.archived_by ? userMap.get(row.archived_by) || null : null,
      archivedAt: row.archived_at ? formatShortDate(row.archived_at) : null,
    });
  }

  // Subcategories
  const archivedSubcategories = db
    .prepare(
      `SELECT id, name, archived_by, archived_at
       FROM subcategories WHERE archived = 1
       ORDER BY archived_at DESC`
    )
    .all() as ArchivedRow[];
  for (const row of archivedSubcategories) {
    items.push({
      id: row.id,
      name: row.name,
      entityType: "subcategory",
      entityLabel: "subcategory",
      apiPath: `/api/subcategories/${row.id}`,
      archivedBy: row.archived_by ? userMap.get(row.archived_by) || null : null,
      archivedAt: row.archived_at ? formatShortDate(row.archived_at) : null,
    });
  }

  // Sort all items by archived_at descending (most recent first)
  items.sort((a, b) => {
    if (!a.archivedAt && !b.archivedAt) return 0;
    if (!a.archivedAt) return 1;
    if (!b.archivedAt) return -1;
    return 0; // already sorted within each query
  });

  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <h1 className="font-heading text-xl text-navy">Archive</h1>
      </header>

      {/* Filter + List */}
      <ArchiveFilter items={items} />

      <div className="h-8" />
    </div>
  );
}
