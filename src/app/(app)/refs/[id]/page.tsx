import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveRefButton } from "./ArchiveRefButton";

// -- Types --------------------------------------------------------------------

interface RefRow {
  id: string;
  ref_type: string;
  title: string;
  date: string | null;
  detail: string | null;
  created_by: string | null;
  created_at: string;
  archived: number;
}

interface LinkedCardRow {
  id: string;
  title: string;
}

interface LinkedTodoRow {
  id: string;
  title: string;
  status: string;
}

interface LinkedPersonRow {
  id: string;
  name: string;
}

interface LinkedMeetingNoteRow {
  id: string;
  title: string;
  date: string;
}

interface CreatorRow {
  name: string;
}

// -- Helpers ------------------------------------------------------------------

const REF_ICONS: Record<string, string> = {
  email: "\u{1F4E7}",
  document: "\u{1F4C4}",
  folder: "\u{1F4C1}",
  call: "\u{1F4DE}",
  meeting: "\u{1F91D}",
  link: "\u{1F517}",
  other: "\u{1F4DD}",
};

const REF_LABELS: Record<string, string> = {
  email: "Email",
  document: "Document",
  folder: "Folder",
  call: "Call",
  meeting: "Meeting",
  link: "Link",
  other: "Other",
};

function formatLongDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// -- Page ---------------------------------------------------------------------

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RefDetailPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  void session;

  const { id } = await params;
  const db = getDb();

  // Fetch the reference
  const ref = db
    .prepare("SELECT * FROM refs WHERE id = ? AND archived = 0")
    .get(id) as RefRow | undefined;

  if (!ref) {
    notFound();
  }

  // Creator name
  let creatorName: string | null = null;
  if (ref.created_by) {
    const creator = db
      .prepare("SELECT name FROM users WHERE id = ?")
      .get(ref.created_by) as CreatorRow | undefined;
    creatorName = creator?.name ?? null;
  }

  // Linked cards (via card_refs junction + ref_entities where entity_type='card')
  const linkedCards = db
    .prepare(
      `SELECT DISTINCT c.id, c.title FROM cards c
       LEFT JOIN card_refs cr ON cr.card_id = c.id AND cr.ref_id = ?
       LEFT JOIN ref_entities re ON re.entity_type = 'card' AND re.entity_id = c.id AND re.ref_id = ?
       WHERE (cr.ref_id IS NOT NULL OR re.ref_id IS NOT NULL) AND c.archived = 0`
    )
    .all(id, id) as LinkedCardRow[];

  // Linked todos (via todo_refs junction + ref_entities where entity_type='todo')
  const linkedTodos = db
    .prepare(
      `SELECT DISTINCT t.id, t.title, t.status FROM todos t
       LEFT JOIN todo_refs tr ON tr.todo_id = t.id AND tr.ref_id = ?
       LEFT JOIN ref_entities re ON re.entity_type = 'todo' AND re.entity_id = t.id AND re.ref_id = ?
       WHERE (tr.ref_id IS NOT NULL OR re.ref_id IS NOT NULL) AND t.archived = 0`
    )
    .all(id, id) as LinkedTodoRow[];

  // Linked people (via ref_entities where entity_type='person')
  const linkedPeople = db
    .prepare(
      `SELECT p.id, p.name FROM people p
       JOIN ref_entities re ON re.entity_type = 'person' AND re.entity_id = p.id
       WHERE re.ref_id = ? AND p.archived = 0`
    )
    .all(id) as LinkedPersonRow[];

  // Linked meeting notes (via ref_entities where entity_type='meeting_note')
  const linkedMeetingNotes = db
    .prepare(
      `SELECT mn.id, mn.title, mn.date FROM meeting_notes mn
       JOIN ref_entities re ON re.entity_type = 'meeting_note' AND re.entity_id = mn.id
       WHERE re.ref_id = ? AND mn.archived = 0
       ORDER BY mn.date DESC`
    )
    .all(id) as LinkedMeetingNoteRow[];

  const hasLinked =
    linkedCards.length > 0 ||
    linkedTodos.length > 0 ||
    linkedPeople.length > 0 ||
    linkedMeetingNotes.length > 0;

  const icon = REF_ICONS[ref.ref_type] || REF_ICONS.other;
  const typeLabel = REF_LABELS[ref.ref_type] || "Other";

  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href="/browse"
              className="text-sm text-stone-400 hover:text-navy transition-colors"
            >
              &larr; {icon} {ref.title}
            </Link>
            <h1 className="mt-1 font-heading text-xl text-navy">
              {icon} {ref.title}
            </h1>
          </div>
          <ArchiveRefButton refId={ref.id} />
        </div>

        {/* Type + Date */}
        <div className="mt-2 space-y-0.5">
          <p className="text-sm text-stone-500">
            Type: {typeLabel}
          </p>
          {ref.date && (
            <p className="text-sm text-stone-500">
              Date: {formatLongDate(ref.date)}
            </p>
          )}
        </div>
      </header>

      {/* Detail */}
      {ref.detail && (
        <section className="border-t border-stone-200 py-4">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Detail
          </h2>
          <p className="text-sm text-navy whitespace-pre-wrap">{ref.detail}</p>
        </section>
      )}

      {/* Linked entities */}
      {hasLinked && (
        <section className="border-t border-stone-200 py-4">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Linked to
          </h2>
          <ul className="space-y-2">
            {linkedCards.map((card) => (
              <li key={card.id} className="text-sm flex items-baseline gap-2">
                <span className="text-stone-400">{"\u{1F517}"}</span>
                <Link
                  href={`/cards/${card.id}`}
                  className="text-navy hover:underline"
                >
                  {card.title}
                </Link>
                <span className="text-xs text-stone-400">(card)</span>
              </li>
            ))}
            {linkedTodos.map((todo) => (
              <li key={todo.id} className="text-sm flex items-baseline gap-2">
                <span>
                  {todo.status === "done" ? (
                    <span className="text-green-500 text-xs">{"\u2713"}</span>
                  ) : (
                    <span className="text-stone-400">{"\u2610"}</span>
                  )}
                </span>
                <Link
                  href={`/todos/${todo.id}`}
                  className={`hover:underline ${
                    todo.status === "done"
                      ? "text-stone-400 line-through"
                      : "text-navy"
                  }`}
                >
                  {todo.title}
                </Link>
                <span className="text-xs text-stone-400">(to-do)</span>
              </li>
            ))}
            {linkedPeople.map((person) => (
              <li key={person.id} className="text-sm flex items-baseline gap-2">
                <span className="text-stone-400">{"\u{1F464}"}</span>
                <Link
                  href={`/people/${person.id}`}
                  className="text-navy hover:underline"
                >
                  {person.name}
                </Link>
                <span className="text-xs text-stone-400">(person)</span>
              </li>
            ))}
            {linkedMeetingNotes.map((mn) => (
              <li key={mn.id} className="text-sm flex items-baseline gap-2">
                <span className="text-stone-400">{"\u{1F4DD}"}</span>
                <Link
                  href={`/meeting-notes/${mn.id}`}
                  className="text-navy hover:underline"
                >
                  {mn.title}
                </Link>
                <span className="text-xs text-stone-400">(meeting note)</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer */}
      <section className="border-t border-stone-200 py-4">
        <p className="text-xs text-stone-400">
          {creatorName && <span>Added by {creatorName} &middot; </span>}
          {formatLongDate(ref.created_at)}
        </p>
      </section>

      <div className="h-8" />
    </div>
  );
}
