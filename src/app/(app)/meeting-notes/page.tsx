import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { CreateMeetingNoteForm } from "./CreateMeetingNoteForm";
import { MeetingNotesSearch } from "./MeetingNotesSearch";

// -- Types --------------------------------------------------------------------

interface MeetingNoteRow {
  id: string;
  title: string;
  date: string;
  content: string | null;
  tags: string | null;
}

interface AttendeeRow {
  id: string;
  name: string;
  organisation_name: string | null;
}

interface UserRow {
  id: string;
  name: string;
}

interface PersonOption {
  id: string;
  name: string;
  organisation_name: string | null;
}

// -- Helpers ------------------------------------------------------------------

function formatShortDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// -- Page ---------------------------------------------------------------------

export default async function MeetingNotesPage() {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  void session;

  const db = getDb();

  // All non-archived meeting notes ordered by date desc
  const notes = db
    .prepare(
      `SELECT id, title, date, content, tags
       FROM meeting_notes
       WHERE archived = 0
       ORDER BY date DESC, created_at DESC`
    )
    .all() as MeetingNoteRow[];

  // Enrich each note with attendees
  const enrichedNotes = notes.map((note) => {
    const attendees = db
      .prepare(
        `SELECT p.id, p.name, o.name AS organisation_name
         FROM people p
         JOIN meeting_note_people mnp ON mnp.person_id = p.id
         LEFT JOIN organisations o ON o.id = p.organisation_id
         WHERE mnp.meeting_note_id = ?`
      )
      .all(note.id) as AttendeeRow[];

    // Check if any attendees are also users (by matching name)
    const users = db
      .prepare("SELECT id, name FROM users")
      .all() as UserRow[];
    const userNames = new Set(users.map((u) => u.name));

    const attendeeDisplay = attendees.map((a) => {
      const isUser = userNames.has(a.name);
      const orgSuffix = a.organisation_name && !isUser ? ` (${a.organisation_name})` : "";
      return a.name + orgSuffix;
    });

    // Parse tags
    const tagList = note.tags
      ? note.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    // Preview: first ~100 chars of content
    const preview = note.content
      ? note.content.length > 100
        ? note.content.slice(0, 100) + "..."
        : note.content
      : "";

    return {
      id: note.id,
      title: note.title,
      date: note.date,
      dateFormatted: formatShortDate(note.date),
      content: note.content || "",
      preview,
      attendees: attendeeDisplay,
      tags: tagList,
    };
  });

  // Collect all unique tags for the filter
  const allTags = Array.from(
    new Set(enrichedNotes.flatMap((n) => n.tags))
  ).sort();

  // People for attendee selection on create form
  const people = db
    .prepare(
      `SELECT p.id, p.name, o.name AS organisation_name
       FROM people p
       LEFT JOIN organisations o ON o.id = p.organisation_id
       WHERE p.archived = 0
       ORDER BY p.name ASC`
    )
    .all() as PersonOption[];

  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <div className="flex flex-wrap items-center justify-between">
          <h1 className="font-heading text-xl text-navy">Meeting Notes</h1>
          <CreateMeetingNoteForm people={people} />
        </div>
      </header>

      {/* Search + Filtered List */}
      <MeetingNotesSearch notes={enrichedNotes} allTags={allTags} />

      <div className="h-8" />
    </div>
  );
}
