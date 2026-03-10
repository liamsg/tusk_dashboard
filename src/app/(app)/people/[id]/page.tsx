import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddNoteForm } from "@/components/AddNoteForm";
import { ArchivePersonButton } from "./ArchivePersonButton";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PersonRow {
  id: string;
  name: string;
  organisation_id: string | null;
  role: string | null;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  archived: number;
}

interface OrgRow {
  id: string;
  name: string;
  org_type: string | null;
}

interface LinkedCardRow {
  id: string;
  title: string;
  status: string;
  category_name: string | null;
  subcategory_name: string | null;
  org_name: string | null;
}

interface LinkedTodoRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  assignee_name: string | null;
}

interface LinkedMeetingNoteRow {
  id: string;
  title: string;
  date: string;
}

interface NoteRow {
  id: string;
  content: string;
  created_at: string;
  creator_name: string | null;
}

interface RefRow {
  id: string;
  ref_type: string;
  title: string;
  date: string | null;
}

interface ActivityRow {
  id: string;
  description: string | null;
  user_name: string | null;
  created_at: string;
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

export default async function PersonDetailPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  void session;

  const { id } = await params;
  const db = getDb();

  // Fetch person
  const person = db
    .prepare("SELECT * FROM people WHERE id = ? AND archived = 0")
    .get(id) as PersonRow | undefined;

  if (!person) {
    notFound();
  }

  // Organisation
  let org: OrgRow | undefined;
  if (person.organisation_id) {
    org = db
      .prepare("SELECT id, name, org_type FROM organisations WHERE id = ?")
      .get(person.organisation_id) as OrgRow | undefined;
  }

  // Linked cards (via card_people, with category path)
  const linkedCards = db
    .prepare(
      `SELECT c.id, c.title, c.status,
              cat.name AS category_name,
              sub.name AS subcategory_name,
              o.name AS org_name
       FROM cards c
       JOIN card_people cp ON cp.card_id = c.id
       LEFT JOIN subcategories sub ON sub.id = c.subcategory_id
       LEFT JOIN categories cat ON cat.id = COALESCE(sub.category_id, c.category_id)
       LEFT JOIN org_cards oc ON oc.card_id = c.id
       LEFT JOIN organisations o ON o.id = oc.organisation_id
       WHERE cp.person_id = ? AND c.archived = 0`
    )
    .all(id) as LinkedCardRow[];

  // Linked todos (via todo_people)
  const linkedTodos = db
    .prepare(
      `SELECT t.id, t.title, t.status, t.due_date,
              u.name AS assignee_name
       FROM todos t
       JOIN todo_people tp ON tp.todo_id = t.id
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE tp.person_id = ? AND t.archived = 0
       ORDER BY t.due_date ASC`
    )
    .all(id) as LinkedTodoRow[];

  // Meeting notes (via meeting_note_people)
  const meetingNotes = db
    .prepare(
      `SELECT mn.id, mn.title, mn.date
       FROM meeting_notes mn
       JOIN meeting_note_people mnp ON mnp.meeting_note_id = mn.id
       WHERE mnp.person_id = ? AND mn.archived = 0
       ORDER BY mn.date DESC`
    )
    .all(id) as LinkedMeetingNoteRow[];

  // Notes on this person
  const notes = db
    .prepare(
      `SELECT n.id, n.content, n.created_at, u.name AS creator_name
       FROM notes n
       LEFT JOIN users u ON u.id = n.created_by
       WHERE n.entity_type = 'person' AND n.entity_id = ? AND n.archived = 0
       ORDER BY n.created_at DESC`
    )
    .all(id) as NoteRow[];

  // References linked to this person (via ref_entities)
  const refs = db
    .prepare(
      `SELECT r.id, r.ref_type, r.title, r.date
       FROM refs r
       JOIN ref_entities re ON re.ref_id = r.id
       WHERE re.entity_type = 'person' AND re.entity_id = ? AND r.archived = 0
       ORDER BY r.date DESC, r.created_at DESC`
    )
    .all(id) as RefRow[];

  // Activity log
  const activities = db
    .prepare(
      `SELECT al.id, al.description, u.name AS user_name, al.created_at
       FROM activity_log al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.entity_type = 'person' AND al.entity_id = ?
       ORDER BY al.created_at DESC`
    )
    .all(id) as ActivityRow[];

  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href="/people"
              className="text-sm text-stone-400 hover:text-navy transition-colors"
            >
              &larr; {person.name}
            </Link>
            <h1 className="mt-1 font-heading text-xl text-navy">
              {person.name}
            </h1>
          </div>
          <ArchivePersonButton personId={person.id} />
        </div>

        {/* Org + Role */}
        {(org || person.role) && (
          <p className="mt-1 text-sm text-stone-500">
            {org && <span>{org.name}</span>}
            {org && person.role && <span> &middot; </span>}
            {person.role && <span>{person.role}</span>}
          </p>
        )}

        {/* Contact details */}
        <div className="mt-2 space-y-0.5">
          {person.email && (
            <p className="text-sm text-stone-500">
              <a
                href={`mailto:${person.email}`}
                className="hover:text-navy transition-colors"
              >
                {person.email}
              </a>
            </p>
          )}
          {person.phone && (
            <p className="text-sm text-stone-500">
              <a
                href={`tel:${person.phone}`}
                className="hover:text-navy transition-colors"
              >
                {person.phone}
              </a>
            </p>
          )}
        </div>

        {/* Relationship */}
        {person.relationship && (
          <p className="mt-2 text-sm text-stone-500 italic">
            Relationship: {person.relationship}
          </p>
        )}
      </header>

      {/* Linked Cards */}
      <section className="border-t border-stone-200 py-4">
        <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
          Linked Cards
        </h2>
        {linkedCards.length === 0 ? (
          <p className="text-sm text-stone-400">No linked cards.</p>
        ) : (
          <ul className="space-y-2">
            {linkedCards.map((card) => {
              const path = [card.category_name, card.subcategory_name]
                .filter(Boolean)
                .join(" > ");
              return (
                <li key={card.id} className="text-sm flex items-baseline gap-2">
                  <span className="text-stone-400">{"\uD83D\uDD17"}</span>
                  <div>
                    <Link
                      href={`/cards/${card.id}`}
                      className="text-navy hover:underline"
                    >
                      {card.org_name && (
                        <span className="text-stone-500">{card.org_name} &mdash; </span>
                      )}
                      {card.title}
                    </Link>
                    {path && (
                      <span className="text-xs text-stone-400 ml-1.5">
                        {path}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* To-Dos involving this person */}
      <section className="border-t border-stone-200 py-4">
        <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
          To-Dos
        </h2>
        {linkedTodos.length === 0 ? (
          <p className="text-sm text-stone-400">No linked to-dos.</p>
        ) : (
          <ul className="space-y-2">
            {linkedTodos.map((todo) => (
              <li key={todo.id} className="text-sm flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">
                  {todo.status === "done" ? (
                    <span className="text-green-500 text-xs">&#10003;</span>
                  ) : (
                    <span className="inline-block h-4 w-4 rounded border border-stone-300 bg-white" />
                  )}
                </span>
                <div>
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
                  <span className="text-stone-400 text-xs ml-1.5">
                    {todo.assignee_name && `\u2014 ${todo.assignee_name}`}
                    {todo.due_date && `, ${formatShortDate(todo.due_date)}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Meeting Notes */}
      {meetingNotes.length > 0 && (
        <section className="border-t border-stone-200 py-4">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Meeting Notes
          </h2>
          <ul className="space-y-2">
            {meetingNotes.map((mn) => (
              <li key={mn.id} className="text-sm flex items-baseline gap-2">
                <span>{"\uD83D\uDCDD"}</span>
                <span className="text-navy">{mn.title}</span>
                <span className="text-xs text-stone-400">
                  &mdash; {formatShortDate(mn.date)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Notes */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            Notes
          </h2>
          <AddNoteForm entityType="person" entityId={person.id} />
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

      {/* References */}
      {refs.length > 0 && (
        <section className="border-t border-stone-200 py-4">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
            References
          </h2>
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
        </section>
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
