import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { AddNoteForm } from "@/components/AddNoteForm";
import { AddReferenceForm } from "@/components/AddReferenceForm";
import { ArchiveButton } from "./ArchiveButton";
import { FlagButton } from "./FlagButton";
import { StatusDropdown } from "./StatusDropdown";
import { AddPersonInline } from "./AddPersonInline";
import { AddTodoInline } from "./AddTodoInline";
import { EditSummary } from "./EditSummary";
import { LinkMeetingNoteInline } from "./LinkMeetingNoteInline";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CardRow {
  id: string;
  title: string;
  summary: string | null;
  status: "new" | "in_progress" | "done" | "on_hold";
  category_id: string | null;
  subcategory_id: string | null;
  flagged_for_discussion: number;
  created_by: string | null;
  created_at: string;
  archived: number;
}

interface PersonRow {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  organisation_name: string | null;
  relationship: string | null;
}

interface TodoRow {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  ball_in_court: string | null;
  ball_in_court_person_id: string | null;
  status: string;
  assignee_name: string | null;
  bic_person_name: string | null;
}

interface RefRow {
  id: string;
  ref_type: string;
  title: string;
  date: string | null;
  detail: string | null;
}

interface MeetingNoteRow {
  id: string;
  title: string;
  date: string;
  content: string | null;
}

interface NoteRow {
  id: string;
  content: string;
  created_at: string;
  creator_name: string | null;
}

interface ActivityRow {
  id: string;
  description: string | null;
  user_name: string | null;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
  workstream_id: string;
}

interface SubcategoryRow {
  id: string;
  name: string;
  category_id: string;
}

interface WorkstreamRow {
  id: string;
  name: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatShortDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatLongDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const REF_ICONS: Record<string, string> = {
  email: "\uD83D\uDCE7",
  document: "\uD83D\uDCC4",
  folder: "\uD83D\uDCC1",
  call: "\uD83D\uDCDE",
  meeting: "\uD83D\uDCC5",
  link: "\uD83D\uDD17",
  other: "\uD83D\uDCCE",
};

// ── Page ───────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CardDetailPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);

  const { id } = await params;
  const db = getDb();

  // Fetch card
  const card = db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .get(id) as CardRow | undefined;

  if (!card) {
    notFound();
  }

  // Breadcrumb data
  let category: CategoryRow | undefined;
  let subcategory: SubcategoryRow | undefined;
  let workstream: WorkstreamRow | undefined;

  if (card.subcategory_id) {
    subcategory = db
      .prepare("SELECT id, name, category_id FROM subcategories WHERE id = ?")
      .get(card.subcategory_id) as SubcategoryRow | undefined;
    if (subcategory) {
      category = db
        .prepare("SELECT id, name, workstream_id FROM categories WHERE id = ?")
        .get(subcategory.category_id) as CategoryRow | undefined;
    }
  }

  if (!category && card.category_id) {
    category = db
      .prepare("SELECT id, name, workstream_id FROM categories WHERE id = ?")
      .get(card.category_id) as CategoryRow | undefined;
  }

  if (category) {
    workstream = db
      .prepare("SELECT id, name FROM workstreams WHERE id = ?")
      .get(category.workstream_id) as WorkstreamRow | undefined;
  }

  // Sibling cards for prev/next navigation
  let siblings: { id: string; title: string }[] = [];
  if (card.subcategory_id) {
    siblings = db
      .prepare(
        `SELECT id, title FROM cards
         WHERE subcategory_id = ? AND archived = 0
         ORDER BY title`
      )
      .all(card.subcategory_id) as { id: string; title: string }[];
  } else if (card.category_id) {
    siblings = db
      .prepare(
        `SELECT id, title FROM cards
         WHERE category_id = ? AND subcategory_id IS NULL AND archived = 0
         ORDER BY title`
      )
      .all(card.category_id) as { id: string; title: string }[];
  }

  const siblingIndex = siblings.findIndex((s) => s.id === card.id);
  const prevCard = siblingIndex > 0 ? siblings[siblingIndex - 1] : null;
  const nextCard =
    siblingIndex >= 0 && siblingIndex < siblings.length - 1
      ? siblings[siblingIndex + 1]
      : null;
  const showSiblingNav = siblings.length > 1;

  // People
  const people = db
    .prepare(
      `SELECT p.id, p.name, p.role, p.email, p.phone, p.relationship,
              o.name AS organisation_name
       FROM people p
       JOIN card_people cp ON cp.person_id = p.id
       LEFT JOIN organisations o ON o.id = p.organisation_id
       WHERE cp.card_id = ? AND p.archived = 0`
    )
    .all(id) as PersonRow[];

  // Todos
  const todos = db
    .prepare(
      `SELECT t.id, t.title, t.description, t.assigned_to, t.due_date,
              t.ball_in_court, t.ball_in_court_person_id, t.status,
              u.name AS assignee_name,
              bic.name AS bic_person_name
       FROM todos t
       JOIN card_todos ct ON ct.todo_id = t.id
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN people bic ON bic.id = t.ball_in_court_person_id
       WHERE ct.card_id = ? AND t.archived = 0
       ORDER BY t.sort_order ASC`
    )
    .all(id) as TodoRow[];

  // References
  const refs = db
    .prepare(
      `SELECT r.id, r.ref_type, r.title, r.date, r.detail
       FROM refs r
       JOIN card_refs cr ON cr.ref_id = r.id
       WHERE cr.card_id = ? AND r.archived = 0
       ORDER BY r.date DESC, r.created_at DESC`
    )
    .all(id) as RefRow[];

  // Meeting notes
  const meetingNotes = db
    .prepare(
      `SELECT mn.id, mn.title, mn.date, mn.content
       FROM meeting_notes mn
       JOIN card_meeting_notes cmn ON cmn.meeting_note_id = mn.id
       WHERE cmn.card_id = ? AND mn.archived = 0
       ORDER BY mn.date DESC`
    )
    .all(id) as MeetingNoteRow[];

  // Notes
  const notes = db
    .prepare(
      `SELECT n.id, n.content, n.created_at, u.name AS creator_name
       FROM notes n
       LEFT JOIN users u ON u.id = n.created_by
       WHERE n.entity_type = 'card' AND n.entity_id = ? AND n.archived = 0
       ORDER BY n.created_at DESC`
    )
    .all(id) as NoteRow[];

  // Activity log
  const activities = db
    .prepare(
      `SELECT al.id, al.description, u.name AS user_name, al.created_at
       FROM activity_log al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.entity_type = 'card' AND al.entity_id = ?
       ORDER BY al.created_at DESC`
    )
    .all(id) as ActivityRow[];

  // Available users for todo assignment
  const users = db
    .prepare("SELECT id, name FROM users")
    .all() as { id: string; name: string }[];

  const backHref = workstream
    ? `/browse/${workstream.id}`
    : "/browse";

  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href={backHref}
              className="text-sm text-stone-400 hover:text-navy transition-colors"
            >
              &larr; {card.title}
            </Link>
            <h1 className="mt-1 font-heading text-xl text-navy">
              {card.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <FlagButton cardId={card.id} flagged={!!card.flagged_for_discussion} />
            <ArchiveButton cardId={card.id} />
          </div>
        </div>

        {/* Breadcrumb */}
        {workstream && (
          <p className="mt-1 text-sm text-stone-400">
            <Link
              href={`/browse/${workstream.id}`}
              className="hover:text-navy transition-colors"
            >
              {workstream.name}
            </Link>
            {category && (
              <>
                {" > "}
                <Link
                  href={`/browse/${workstream.id}?category=${category.id}`}
                  className="hover:text-navy transition-colors"
                >
                  {category.name}
                </Link>
              </>
            )}
            {subcategory && (
              <>
                {" > "}
                <span>{subcategory.name}</span>
              </>
            )}
            {" > "}
            <span className="text-stone-500">{card.title}</span>
          </p>
        )}
        {showSiblingNav && (
          <p className="mt-0.5 text-xs text-stone-400">
            Card {siblingIndex + 1} of {siblings.length}
          </p>
        )}

        {/* Status dropdown */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-stone-400">Status:</span>
          <StatusDropdown cardId={card.id} currentStatus={card.status} />
        </div>
      </header>

      {/* Summary */}
      <section className="border-t border-stone-200 py-4">
        <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-2">
          Summary
        </h2>
        <EditSummary cardId={card.id} initialSummary={card.summary} />
      </section>

      {/* Key People */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            Key People
          </h2>
          <AddPersonInline cardId={card.id} />
        </div>
        {people.length === 0 ? (
          <p className="text-sm text-stone-400">No people linked yet.</p>
        ) : (
          <ul className="space-y-3">
            {people.map((person) => (
              <li key={person.id} className="text-sm">
                <p className="text-navy">
                  <span className="font-medium">{person.name}</span>
                  {person.role && (
                    <span className="text-stone-400"> &middot; {person.role}</span>
                  )}
                </p>
                {(person.email || person.phone) && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {person.email}
                    {person.email && person.phone && " \u00B7 "}
                    {person.phone}
                  </p>
                )}
                {person.relationship && (
                  <p className="text-xs text-stone-500 mt-0.5 italic">
                    &quot;{person.relationship}&quot;
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* To-Dos */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            To-Dos
          </h2>
          <AddTodoInline cardId={card.id} users={users} />
        </div>
        {todos.length === 0 ? (
          <p className="text-sm text-stone-400">No to-dos yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {todos.map((todo) => (
              <li key={todo.id} className="text-sm flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">
                  {todo.status === "done" ? (
                    <span className="text-green-500 text-xs">&#10003;</span>
                  ) : (
                    <span className="inline-block h-4 w-4 rounded border border-stone-300 bg-white" />
                  )}
                </span>
                <div className="min-w-0">
                  <span
                    className={
                      todo.status === "done"
                        ? "text-stone-400 line-through"
                        : "text-navy"
                    }
                  >
                    {todo.title}
                  </span>
                  <span className="text-stone-400 text-xs ml-1.5">
                    {todo.assignee_name && `\u2014 ${todo.assignee_name}`}
                    {todo.due_date &&
                      `, ${formatShortDate(todo.due_date)}`}
                  </span>
                  {todo.ball_in_court === "external" &&
                    todo.bic_person_name && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mr-1" />
                        External ({todo.bic_person_name})
                        {todo.description && ` \u2014 ${todo.description}`}
                      </p>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* References */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            References
          </h2>
          <AddReferenceForm entityType="card" entityId={card.id} />
        </div>
        {refs.length === 0 ? (
          <p className="text-sm text-stone-400">No references yet.</p>
        ) : (
          <ul className="space-y-2">
            {refs.map((ref) => (
              <li key={ref.id} className="text-sm flex items-baseline gap-2">
                <span>{REF_ICONS[ref.ref_type] || REF_ICONS.other}</span>
                <span className="text-navy">{ref.title}</span>
                {ref.date && (
                  <span className="text-xs text-stone-400">
                    &mdash; {formatShortDate(ref.date)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Meeting Notes */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            Meeting Notes
          </h2>
          <LinkMeetingNoteInline
            cardId={card.id}
            linkedIds={meetingNotes.map((mn) => mn.id)}
          />
        </div>
        {meetingNotes.length === 0 ? (
          <p className="text-sm text-stone-400">No meeting notes linked yet.</p>
        ) : (
          <ul className="space-y-2">
            {meetingNotes.map((mn) => (
              <li key={mn.id} className="text-sm flex items-baseline gap-2">
                <span>{"\uD83D\uDCDD"}</span>
                <Link
                  href={`/meeting-notes/${mn.id}`}
                  className="text-navy hover:underline"
                >
                  {mn.title}
                </Link>
                <span className="text-xs text-stone-400">
                  &mdash; {formatShortDate(mn.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Notes */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            Notes
          </h2>
          <AddNoteForm entityType="card" entityId={card.id} />
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-stone-400">No notes yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {notes.map((note) => (
              <li key={note.id} className="text-sm">
                <p className="text-navy italic">
                  &quot;{note.content}&quot;
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {note.creator_name && (
                    <span>&mdash; {note.creator_name}, </span>
                  )}
                  {formatShortDate(note.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Prev / Next navigation */}
      {showSiblingNav && (
        <nav className="flex justify-between border-t border-stone-200 py-3 text-sm text-stone-500">
          {prevCard ? (
            <Link
              href={`/cards/${prevCard.id}`}
              className="hover:text-navy transition-colors"
            >
              &larr; {prevCard.title}
            </Link>
          ) : (
            <span />
          )}
          {nextCard ? (
            <Link
              href={`/cards/${nextCard.id}`}
              className="hover:text-navy transition-colors"
            >
              {nextCard.title} &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {/* Activity */}
      {activities.length > 0 && (
        <section className="border-t border-stone-200 py-4">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Activity
          </h2>
          <ul className="space-y-1.5">
            {activities.map((act) => (
              <li key={act.id} className="text-xs text-stone-400">
                {act.user_name && (
                  <span className="text-navy-light">{act.user_name} </span>
                )}
                {act.description || "Activity recorded"}
                <span className="ml-1.5">
                  &mdash; {formatLongDate(act.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="h-8" />
    </div>
  );
}
