import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddNoteForm } from "@/components/AddNoteForm";
import { AddReferenceForm } from "@/components/AddReferenceForm";
import { MeetingNoteActions } from "./MeetingNoteActions";
import { LinkItemToNote } from "./LinkItemToNote";
import { EditNoteContent } from "./EditNoteContent";
import { EditNoteTitle } from "./EditNoteTitle";
import { CreateTodoFromNote } from "./CreateTodoFromNote";

// -- Types --------------------------------------------------------------------

interface MeetingNoteRow {
  id: string;
  title: string;
  date: string;
  content: string | null;
  recorded_by: string | null;
  tags: string | null;
  archived: number;
}

interface AttendeeRow {
  id: string;
  name: string;
  organisation_name: string | null;
}

interface LinkedCardRow {
  id: string;
  title: string;
  status: string;
}

interface LinkedTodoRow {
  id: string;
  title: string;
  status: string;
  assignee_name: string | null;
}

interface LinkedPersonRow {
  id: string;
  name: string;
  organisation_name: string | null;
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

interface UserOption {
  id: string;
  name: string;
}

interface CardOption {
  id: string;
  title: string;
}

interface PersonOption {
  id: string;
  name: string;
}

// -- Helpers ------------------------------------------------------------------

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

function formatDatetime(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  const datePart = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (iso.includes("T")) {
    const timePart = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${datePart}, ${timePart}`;
  }
  return datePart;
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

// -- Page ---------------------------------------------------------------------

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MeetingNoteDetailPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  void session;

  const { id } = await params;
  const db = getDb();

  // Fetch the meeting note
  const meetingNote = db
    .prepare("SELECT * FROM meeting_notes WHERE id = ? AND archived = 0")
    .get(id) as MeetingNoteRow | undefined;

  if (!meetingNote) {
    notFound();
  }

  // Recorded by user name
  let recorderName: string | null = null;
  if (meetingNote.recorded_by) {
    const recorder = db
      .prepare("SELECT name FROM users WHERE id = ?")
      .get(meetingNote.recorded_by) as { name: string } | undefined;
    recorderName = recorder?.name || null;
  }

  // Attendees (people linked via meeting_note_people)
  const attendees = db
    .prepare(
      `SELECT p.id, p.name, o.name AS organisation_name
       FROM people p
       JOIN meeting_note_people mnp ON mnp.person_id = p.id
       LEFT JOIN organisations o ON o.id = p.organisation_id
       WHERE mnp.meeting_note_id = ?`
    )
    .all(id) as AttendeeRow[];

  // Linked cards
  const linkedCards = db
    .prepare(
      `SELECT c.id, c.title, c.status
       FROM cards c
       JOIN card_meeting_notes cmn ON cmn.card_id = c.id
       WHERE cmn.meeting_note_id = ? AND c.archived = 0`
    )
    .all(id) as LinkedCardRow[];

  // Linked todos
  const linkedTodos = db
    .prepare(
      `SELECT t.id, t.title, t.status, u.name AS assignee_name
       FROM todos t
       JOIN meeting_note_todos mnt ON mnt.todo_id = t.id
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE mnt.meeting_note_id = ? AND t.archived = 0
       ORDER BY t.sort_order ASC`
    )
    .all(id) as LinkedTodoRow[];

  // Notes on this meeting note
  const notes = db
    .prepare(
      `SELECT n.id, n.content, n.created_at, u.name AS creator_name
       FROM notes n
       LEFT JOIN users u ON u.id = n.created_by
       WHERE n.entity_type = 'meeting_note' AND n.entity_id = ? AND n.archived = 0
       ORDER BY n.created_at DESC`
    )
    .all(id) as NoteRow[];

  // References linked to this meeting note
  const refs = db
    .prepare(
      `SELECT r.id, r.ref_type, r.title, r.date
       FROM refs r
       JOIN ref_entities re ON re.ref_id = r.id
       WHERE re.entity_type = 'meeting_note' AND re.entity_id = ? AND r.archived = 0
       ORDER BY r.date DESC, r.created_at DESC`
    )
    .all(id) as RefRow[];

  // Activity log
  const activities = db
    .prepare(
      `SELECT al.id, al.description, u.name AS user_name, al.created_at
       FROM activity_log al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.entity_type = 'meeting_note' AND al.entity_id = ?
       ORDER BY al.created_at DESC`
    )
    .all(id) as ActivityRow[];

  // Parse tags
  const tagList = meetingNote.tags
    ? meetingNote.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Available cards and people for linking
  const availableCards = db
    .prepare(
      `SELECT id, title FROM cards WHERE archived = 0 ORDER BY title ASC`
    )
    .all() as CardOption[];

  const availablePeople = db
    .prepare(
      `SELECT id, name FROM people WHERE archived = 0 ORDER BY name ASC`
    )
    .all() as PersonOption[];

  // All users for the create-todo form
  const allUsers = db
    .prepare("SELECT id, name FROM users ORDER BY name ASC")
    .all() as UserOption[];

  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href="/meeting-notes"
              className="text-sm text-stone-400 hover:text-navy transition-colors"
            >
              &larr; {meetingNote.title}
            </Link>
            <EditNoteTitle meetingNoteId={meetingNote.id} title={meetingNote.title} />
          </div>
          <MeetingNoteActions meetingNoteId={meetingNote.id} />
        </div>

        {/* Date + recorder */}
        <p className="mt-1 text-sm text-stone-500">
          {formatDatetime(meetingNote.date)}
        </p>
        {recorderName && (
          <p className="text-sm text-stone-500">
            Recorded by: {recorderName}
          </p>
        )}

        {/* Attendees */}
        {attendees.length > 0 && (
          <p className="mt-1 text-sm text-stone-500">
            Attendees:{" "}
            {attendees.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <Link
                  href={`/people/${a.id}`}
                  className="hover:text-navy hover:underline transition-colors"
                >
                  {a.name}
                  {a.organisation_name && (
                    <span className="text-stone-400">
                      {" "}
                      ({a.organisation_name})
                    </span>
                  )}
                </Link>
              </span>
            ))}
          </p>
        )}

        {/* Tags */}
        {tagList.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tagList.map((tag) => (
              <span
                key={tag}
                className="inline-flex bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <section className="border-t border-stone-200 py-4">
        <EditNoteContent meetingNoteId={meetingNote.id} content={meetingNote.content} />
      </section>

      {/* Linked Items */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            Linked Items
          </h2>
          <div className="flex items-center gap-3">
            <CreateTodoFromNote meetingNoteId={meetingNote.id} users={allUsers} />
            <LinkItemToNote
              meetingNoteId={meetingNote.id}
              availableCards={availableCards}
              availablePeople={availablePeople}
            />
          </div>
        </div>
        {linkedCards.length === 0 &&
        linkedTodos.length === 0 &&
        attendees.length === 0 ? (
          <p className="text-sm text-stone-400">No linked items yet.</p>
        ) : (
          <ul className="space-y-2">
            {linkedCards.map((card) => (
              <li key={card.id} className="text-sm flex items-baseline gap-2">
                <span className="text-stone-400">{"\uD83D\uDD17"}</span>
                <Link
                  href={`/cards/${card.id}`}
                  className="text-navy hover:underline"
                >
                  {card.title}
                </Link>
                <span className="text-xs text-stone-400">(card)</span>
              </li>
            ))}
            {attendees.map((person) => (
              <li key={person.id} className="text-sm flex items-baseline gap-2">
                <span className="text-stone-400">{"\uD83D\uDD17"}</span>
                <Link
                  href={`/people/${person.id}`}
                  className="text-navy hover:underline"
                >
                  {person.name}
                </Link>
                <span className="text-xs text-stone-400">(person)</span>
              </li>
            ))}
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
                  {todo.assignee_name && (
                    <span className="text-stone-400 text-xs ml-1.5">
                      &mdash; {todo.assignee_name}
                    </span>
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
          <AddReferenceForm entityType="meeting_note" entityId={meetingNote.id} />
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
          <AddNoteForm entityType="meeting_note" entityId={meetingNote.id} />
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
