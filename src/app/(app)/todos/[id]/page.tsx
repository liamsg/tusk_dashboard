import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddNoteForm } from "@/components/AddNoteForm";
import { AddReferenceForm } from "@/components/AddReferenceForm";
import { TodoActions } from "./TodoActions";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TodoRow {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  ball_in_court: string | null;
  ball_in_court_person_id: string | null;
  sort_order: number;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
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

interface LinkedCard {
  id: string;
  title: string;
  category_name: string | null;
  subcategory_name: string | null;
}

interface RefRow {
  id: string;
  ref_type: string;
  title: string;
  date: string | null;
  detail: string | null;
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatShortDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatRelativeDate(iso: string): { label: string; overdue: boolean } {
  const d = new Date(iso + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    if (diffDays === -1) return { label: "yesterday", overdue: true };
    return {
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      overdue: true,
    };
  }
  if (diffDays === 0) return { label: "today", overdue: false };
  if (diffDays === 1) return { label: "tomorrow", overdue: false };
  if (diffDays <= 6) {
    return {
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      overdue: false,
    };
  }
  return {
    label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    overdue: false,
  };
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

const BIC_CONFIG: Record<string, { label: string; colorClass: string }> = {
  us: { label: "Us", colorClass: "bg-blue-500" },
  external: { label: "External", colorClass: "bg-amber-500" },
  on_hold: { label: "On Hold", colorClass: "bg-stone-400" },
};

// ── Page ───────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TodoDetailPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  void session;

  const { id } = await params;
  const db = getDb();

  // Fetch todo
  const todo = db
    .prepare("SELECT * FROM todos WHERE id = ?")
    .get(id) as TodoRow | undefined;

  if (!todo) {
    notFound();
  }

  // Assigned user
  const assignee = todo.assigned_to
    ? (db
        .prepare("SELECT id, name FROM users WHERE id = ?")
        .get(todo.assigned_to) as { id: string; name: string } | undefined)
    : undefined;

  // Ball-in-court person
  const bicPerson = todo.ball_in_court_person_id
    ? (db
        .prepare(
          `SELECT p.id, p.name, p.role, p.email, p.phone, p.relationship,
                  o.name AS organisation_name
           FROM people p
           LEFT JOIN organisations o ON o.id = p.organisation_id
           WHERE p.id = ?`
        )
        .get(todo.ball_in_court_person_id) as PersonRow | undefined)
    : undefined;

  // Linked people
  const people = db
    .prepare(
      `SELECT p.id, p.name, p.role, p.email, p.phone, p.relationship,
              o.name AS organisation_name
       FROM people p
       JOIN todo_people tp ON tp.person_id = p.id
       LEFT JOIN organisations o ON o.id = p.organisation_id
       WHERE tp.todo_id = ? AND p.archived = 0`
    )
    .all(id) as PersonRow[];

  // Linked cards with category paths
  const linkedCards = db
    .prepare(
      `SELECT c.id, c.title,
              cat.name AS category_name,
              sub.name AS subcategory_name
       FROM cards c
       JOIN card_todos ct ON ct.card_id = c.id
       LEFT JOIN subcategories sub ON sub.id = c.subcategory_id
       LEFT JOIN categories cat ON cat.id = COALESCE(sub.category_id, c.category_id)
       WHERE ct.todo_id = ?`
    )
    .all(id) as LinkedCard[];

  // References (from both todo_refs and ref_entities)
  const refs = db
    .prepare(
      `SELECT DISTINCT r.id, r.ref_type, r.title, r.date, r.detail
       FROM refs r
       LEFT JOIN todo_refs tr ON tr.ref_id = r.id AND tr.todo_id = ?
       LEFT JOIN ref_entities re ON re.ref_id = r.id AND re.entity_type = 'todo' AND re.entity_id = ?
       WHERE (tr.todo_id IS NOT NULL OR re.entity_id IS NOT NULL) AND r.archived = 0
       ORDER BY r.date DESC, r.created_at DESC`
    )
    .all(id, id) as RefRow[];

  // Notes
  const notes = db
    .prepare(
      `SELECT n.id, n.content, n.created_at, u.name AS creator_name
       FROM notes n
       LEFT JOIN users u ON u.id = n.created_by
       WHERE n.entity_type = 'todo' AND n.entity_id = ? AND n.archived = 0
       ORDER BY n.created_at DESC`
    )
    .all(id) as NoteRow[];

  // Activity log
  const activities = db
    .prepare(
      `SELECT al.id, al.description, u.name AS user_name, al.created_at
       FROM activity_log al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.entity_type = 'todo' AND al.entity_id = ?
       ORDER BY al.created_at DESC`
    )
    .all(id) as ActivityRow[];

  // All users (for dropdowns)
  const users = db
    .prepare("SELECT id, name FROM users ORDER BY name ASC")
    .all() as { id: string; name: string }[];

  // All cards for linking
  const allCards = db
    .prepare(
      `SELECT c.id, c.title,
              cat.name AS category_name,
              sub.name AS subcategory_name
       FROM cards c
       LEFT JOIN subcategories sub ON sub.id = c.subcategory_id
       LEFT JOIN categories cat ON cat.id = COALESCE(sub.category_id, c.category_id)
       WHERE c.archived = 0
       ORDER BY c.title ASC`
    )
    .all() as LinkedCard[];

  // All people for linking
  const allPeople = db
    .prepare(
      `SELECT p.id, p.name, p.email,
              o.name AS organisation_name
       FROM people p
       LEFT JOIN organisations o ON o.id = p.organisation_id
       WHERE p.archived = 0
       ORDER BY p.name ASC`
    )
    .all() as { id: string; name: string; email: string | null; organisation_name: string | null }[];

  const dateInfo = todo.due_date
    ? formatRelativeDate(todo.due_date)
    : null;

  const bicConfig = BIC_CONFIG[todo.ball_in_court || "us"] ?? BIC_CONFIG.us;

  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <Link
          href="/todos"
          className="text-sm text-stone-400 hover:text-navy transition-colors"
        >
          &larr; Back to To-Dos
        </Link>

        <div className="mt-2">
          <TodoActions
            todoId={todo.id}
            currentStatus={todo.status}
            currentBallInCourt={todo.ball_in_court || "us"}
            currentAssignedTo={todo.assigned_to || ""}
            users={users}
            title={todo.title}
          />
        </div>

        {/* Meta line */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
          {assignee && (
            <span>
              Assigned to: <span className="text-navy">{assignee.name}</span>
            </span>
          )}
          {dateInfo && (
            <span>
              Due:{" "}
              <span
                className={
                  dateInfo.overdue
                    ? "text-red-500 font-medium"
                    : "text-navy"
                }
              >
                {dateInfo.label}
              </span>
            </span>
          )}
        </div>

        {/* Ball in court */}
        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-500">
          Ball in court:{" "}
          <span
            className={`inline-block h-2 w-2 rounded-full ${bicConfig.colorClass}`}
          />
          <span className="text-navy">{bicConfig.label}</span>
          {todo.ball_in_court === "external" && bicPerson && (
            <span className="text-stone-400">
              ({bicPerson.name}
              {bicPerson.organisation_name &&
                ` @ ${bicPerson.organisation_name}`}
              )
            </span>
          )}
        </div>

        {/* Description */}
        {todo.description && (
          <p className="mt-3 text-sm text-navy leading-relaxed">
            {todo.description}
          </p>
        )}
      </header>

      {/* Involves (linked people) */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            Involves
          </h2>
          <AddPersonToTodo todoId={todo.id} allPeople={allPeople} />
        </div>
        {people.length === 0 ? (
          <p className="text-sm text-stone-400">No people linked yet.</p>
        ) : (
          <ul className="space-y-3">
            {people.map((person) => (
              <li key={person.id} className="text-sm">
                <p className="text-navy">
                  <span className="font-medium">{person.name}</span>
                  {person.organisation_name && (
                    <span className="text-stone-400">
                      {" "}
                      &middot; {person.organisation_name}
                    </span>
                  )}
                  {person.role && (
                    <span className="text-stone-400">
                      {" "}
                      &middot; {person.role}
                    </span>
                  )}
                </p>
                {(person.email || person.phone) && (
                  <p className="text-xs text-stone-500 mt-0.5">
                    {person.email && (
                      <a
                        href={`mailto:${person.email}`}
                        className="hover:text-navy transition-colors"
                      >
                        {person.email}
                      </a>
                    )}
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

      {/* Linked Cards */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            Linked Cards
          </h2>
          <LinkCardToTodo todoId={todo.id} allCards={allCards} />
        </div>
        {linkedCards.length === 0 ? (
          <p className="text-sm text-stone-400">No cards linked yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {linkedCards.map((card) => {
              const path = [card.category_name, card.subcategory_name]
                .filter(Boolean)
                .join(" > ");
              return (
                <li key={card.id} className="text-sm">
                  <Link
                    href={`/cards/${card.id}`}
                    className="text-navy hover:underline"
                  >
                    {"\uD83D\uDD17"} {card.title}
                  </Link>
                  {path && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      {"\uD83D\uDCC2"} {path}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* References */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            References
          </h2>
          <AddReferenceForm entityType="todo" entityId={todo.id} />
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

      {/* Notes */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            Notes
          </h2>
          <AddNoteForm entityType="todo" entityId={todo.id} />
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
                  &mdash; {formatShortDate(act.created_at)}
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

// ── Inline Link Components ─────────────────────────────────────────────────────
// These are small client components embedded in the same file for convenience.
// They handle linking existing people/cards to this todo.

function AddPersonToTodo({
  todoId,
  allPeople,
}: {
  todoId: string;
  allPeople: { id: string; name: string; email: string | null; organisation_name: string | null }[];
}) {
  return <AddPersonToTodoClient todoId={todoId} allPeople={allPeople} />;
}

function LinkCardToTodo({
  todoId,
  allCards,
}: {
  todoId: string;
  allCards: LinkedCard[];
}) {
  return <LinkCardToTodoClient todoId={todoId} allCards={allCards} />;
}

// ── Client Components ──────────────────────────────────────────────────────────
// These need to be in separate files since they are "use client" components.
// For now, we import them from co-located files.

import { AddPersonToTodoClient } from "./AddPersonToTodoClient";
import { LinkCardToTodoClient } from "./LinkCardToTodoClient";
