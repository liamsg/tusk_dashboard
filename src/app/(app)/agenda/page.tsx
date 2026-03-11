import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { PrintButton } from "./PrintButton";

// -- Types ------------------------------------------------------------------

interface WorkstreamRow {
  id: string;
  name: string;
  sort_order: number;
}

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
  workstream_id: string;
}

interface CardRow {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  category_id: string | null;
  subcategory_id: string | null;
  flagged_for_discussion: number;
  created_at: string;
}

interface TodoRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  ball_in_court: string;
  assignee_name: string | null;
  assignee_initials: string;
  card_title: string | null;
  category_name: string | null;
}

interface MilestoneRow {
  id: string;
  title: string;
  target_date: string | null;
  status: string;
  workstream_name: string | null;
}

interface ActivityRow {
  description: string | null;
  entity_type: string;
  entity_id: string;
  created_at: string;
  card_title: string | null;
}

interface NoteRow {
  content: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  creator_name: string | null;
}

interface UserRow {
  id: string;
  name: string;
}

// -- Helpers ----------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysFromNow(iso: string): number {
  const target = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// -- Letter labels for workstreams ------------------------------------------

const WORKSTREAM_LETTERS = ["A", "B", "C", "D", "E", "F"];

// -- Page -------------------------------------------------------------------

export default async function AgendaPage() {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  void session;

  const db = getDb();

  // Users (for attendee list)
  const users = db
    .prepare("SELECT id, name FROM users ORDER BY name ASC")
    .all() as UserRow[];

  // Workstreams
  const workstreams = db
    .prepare(
      "SELECT id, name, sort_order FROM workstreams ORDER BY sort_order ASC"
    )
    .all() as WorkstreamRow[];

  // Categories
  const categories = db
    .prepare(
      "SELECT id, name, sort_order, workstream_id FROM categories WHERE archived = 0 ORDER BY sort_order ASC"
    )
    .all() as CategoryRow[];

  // Active cards (non-archived)
  const allCards = db
    .prepare(
      `SELECT id, title, summary, status, category_id, subcategory_id,
              flagged_for_discussion, created_at
       FROM cards WHERE archived = 0
       ORDER BY created_at ASC`
    )
    .all() as CardRow[];

  // Recent activity (last 7 days) grouped by card
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activitySince = sevenDaysAgo.toISOString();

  const recentActivity = db
    .prepare(
      `SELECT al.description, al.entity_type, al.entity_id, al.created_at,
              COALESCE(c.title, '') AS card_title
       FROM activity_log al
       LEFT JOIN cards c ON al.entity_type = 'card' AND al.entity_id = c.id
       WHERE al.created_at >= ?
       ORDER BY al.created_at DESC`
    )
    .all(activitySince) as ActivityRow[];

  // Recent notes on cards (last 7 days)
  const recentNotes = db
    .prepare(
      `SELECT n.content, n.entity_type, n.entity_id, n.created_at, u.name AS creator_name
       FROM notes n
       LEFT JOIN users u ON u.id = n.created_by
       WHERE n.entity_type = 'card' AND n.archived = 0 AND n.created_at >= ?
       ORDER BY n.created_at DESC`
    )
    .all(activitySince) as NoteRow[];

  // Open to-dos
  const openTodos = db
    .prepare(
      `SELECT t.id, t.title, t.status, t.due_date, t.ball_in_court,
              u.name AS assignee_name,
              COALESCE(UPPER(SUBSTR(u.name, 1, 1)), '?') AS assignee_initials,
              (SELECT c.title FROM cards c JOIN card_todos ct ON ct.card_id = c.id WHERE ct.todo_id = t.id LIMIT 1) AS card_title,
              (SELECT cat.name FROM cards c2 JOIN card_todos ct2 ON ct2.card_id = c2.id JOIN categories cat ON cat.id = c2.category_id WHERE ct2.todo_id = t.id LIMIT 1) AS category_name
       FROM todos t
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.archived = 0 AND t.status != 'done'
       ORDER BY t.sort_order ASC`
    )
    .all() as TodoRow[];

  // Milestones (upcoming or in progress)
  const milestones = db
    .prepare(
      `SELECT m.id, m.title, m.target_date, m.status,
              w.name AS workstream_name
       FROM milestones m
       LEFT JOIN workstreams w ON w.id = m.workstream_id
       WHERE m.status != 'complete'
       ORDER BY m.target_date ASC`
    )
    .all() as MilestoneRow[];

  // Build agenda items: group cards by workstream → category
  // A card belongs to a workstream via its category
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Activity and notes lookup by card ID
  const activityByCard = new Map<string, ActivityRow[]>();
  for (const act of recentActivity) {
    if (act.entity_type === "card") {
      const list = activityByCard.get(act.entity_id) || [];
      list.push(act);
      activityByCard.set(act.entity_id, list);
    }
  }

  const notesByCard = new Map<string, NoteRow[]>();
  for (const note of recentNotes) {
    const list = notesByCard.get(note.entity_id) || [];
    list.push(note);
    notesByCard.set(note.entity_id, list);
  }

  // Todos linked to cards
  const todosByCard = new Map<string, TodoRow[]>();
  for (const todo of openTodos) {
    if (todo.card_title) {
      // Find the card ID for this todo
      const cardForTodo = allCards.find((c) => c.title === todo.card_title);
      if (cardForTodo) {
        const list = todosByCard.get(cardForTodo.id) || [];
        list.push(todo);
        todosByCard.set(cardForTodo.id, list);
      }
    }
  }

  // Determine which cards are "agenda-worthy": flagged, or has recent activity/notes, or has open todos
  const agendaCards = allCards.filter((card) => {
    if (card.flagged_for_discussion) return true;
    if (activityByCard.has(card.id)) return true;
    if (notesByCard.has(card.id)) return true;
    if (todosByCard.has(card.id)) return true;
    return false;
  });

  // Group by workstream
  interface AgendaItem {
    card: CardRow;
    category: CategoryRow | null;
    activities: ActivityRow[];
    notes: NoteRow[];
    todos: TodoRow[];
  }

  interface WorkstreamSection {
    workstream: WorkstreamRow;
    letter: string;
    items: AgendaItem[];
  }

  const sections: WorkstreamSection[] = workstreams.map((ws, i) => {
    const wsCategories = categories.filter((c) => c.workstream_id === ws.id);
    const wsCategoryIds = new Set(wsCategories.map((c) => c.id));

    const wsCards = agendaCards
      .filter((card) => card.category_id && wsCategoryIds.has(card.category_id))
      .map((card) => ({
        card,
        category: card.category_id ? categoryMap.get(card.category_id) || null : null,
        activities: activityByCard.get(card.id) || [],
        notes: notesByCard.get(card.id) || [],
        todos: todosByCard.get(card.id) || [],
      }));

    return {
      workstream: ws,
      letter: WORKSTREAM_LETTERS[i] || String(i + 1),
      items: wsCards,
    };
  });

  // Uncategorised cards (no category)
  const uncategorised = agendaCards
    .filter((card) => !card.category_id)
    .map((card) => ({
      card,
      category: null,
      activities: activityByCard.get(card.id) || [],
      notes: notesByCard.get(card.id) || [],
      todos: todosByCard.get(card.id) || [],
    }));

  // Today's date
  const today = formatDate(new Date().toISOString());

  // Attendees
  const attendeeNames = users.map((u) => u.name).join(", ");

  return (
    <>
      {/* Print-only styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');

        @media print {
          /* Hide all app chrome */
          body > div > div > aside,
          body > div > div > div > header,
          body > div > div > div > nav,
          [data-bottom-nav],
          [data-print-hide] {
            display: none !important;
          }
          body > div > div > main,
          body > div > div > div > main {
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            background: white !important;
          }
          .agenda-page {
            max-width: none !important;
            padding: 0 !important;
          }
        }
      `,
        }}
      />

      <div className="agenda-page mx-auto max-w-3xl px-4">
        {/* Screen-only toolbar */}
        <div className="pt-6 pb-4 flex items-center justify-between" data-print-hide>
          <h1 className="font-heading text-xl text-navy">Weekly Agenda</h1>
          <PrintButton />
        </div>

        {/* Agenda document */}
        <div
          className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden print:shadow-none print:border-none print:rounded-none"
          style={{ fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif" }}
        >
          <div className="px-10 py-8 md:px-14 md:py-10">
            {/* Header */}
            <header className="pb-5 mb-8" style={{ borderBottom: "2px solid #1a1a1a" }}>
              <div className="flex justify-between items-baseline">
                <h1
                  className="text-base font-bold tracking-[0.25em] uppercase"
                  style={{ color: "#1a1a1a" }}
                >
                  Project Tusk
                </h1>
                <span className="text-sm italic" style={{ color: "#666" }}>
                  {today}
                </span>
              </div>
              <p className="mt-1 text-sm" style={{ color: "#666" }}>
                Weekly Call &mdash; 9:30am &nbsp;|&nbsp; {attendeeNames}
              </p>
            </header>

            {/* Workstream sections */}
            {sections.map((section, sectionIdx) => {
              if (section.items.length === 0) return null;

              let itemNum = 0;

              return (
                <div key={section.workstream.id} className={sectionIdx > 0 ? "mt-10" : ""}>
                  {/* Section header */}
                  <div
                    className="pb-1 mb-5"
                    style={{ borderBottom: "1px solid #1a1a1a" }}
                  >
                    <span
                      className="text-xs font-bold tracking-[0.2em] uppercase"
                      style={{ color: "#1a1a1a" }}
                    >
                      Part {section.letter} &mdash; {section.workstream.name}
                    </span>
                  </div>

                  {/* Items */}
                  {section.items.map((item) => {
                    itemNum++;
                    const num = `${section.letter}.${itemNum}`;

                    return (
                      <div
                        key={item.card.id}
                        className="mb-6"
                        style={{ pageBreakInside: "avoid" }}
                      >
                        {/* Item header */}
                        <div className="flex items-baseline gap-3 mb-1">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "#1a1a1a", minWidth: "2.2rem" }}
                          >
                            {num}
                          </span>
                          <span className="text-base font-semibold" style={{ color: "#1a1a1a" }}>
                            {item.card.title}
                            {item.card.flagged_for_discussion ? (
                              <span
                                className="ml-2 text-xs font-normal italic"
                                style={{ color: "#b45309" }}
                              >
                                (flagged for discussion)
                              </span>
                            ) : null}
                          </span>
                        </div>

                        {/* Item body */}
                        <div className="pl-9 text-sm" style={{ color: "#333" }}>
                          {/* Summary */}
                          {item.card.summary && (
                            <p className="mb-1">{item.card.summary}</p>
                          )}

                          {/* Recent notes */}
                          {item.notes.length > 0 && (
                            <ul className="list-none p-0 m-0">
                              {item.notes.slice(0, 3).map((note, ni) => (
                                <li
                                  key={ni}
                                  className="relative pl-4 mb-0.5"
                                  style={{ color: "#333" }}
                                >
                                  <span
                                    className="absolute left-0"
                                    style={{ color: "#ccc", fontSize: "0.75rem" }}
                                  >
                                    &mdash;
                                  </span>
                                  <span className="italic">
                                    &ldquo;
                                    {note.content.length > 120
                                      ? note.content.slice(0, 120) + "..."
                                      : note.content}
                                    &rdquo;
                                  </span>
                                  {note.creator_name && (
                                    <span style={{ color: "#999" }}>
                                      {" "}
                                      ({note.creator_name})
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Open to-dos for this card */}
                          {item.todos.length > 0 && (
                            <ul className="list-none p-0 m-0 mt-1">
                              {item.todos.map((todo) => (
                                <li
                                  key={todo.id}
                                  className="relative pl-4 mb-0.5"
                                  style={{ color: "#333" }}
                                >
                                  <span
                                    className="absolute left-0"
                                    style={{ color: "#ccc", fontSize: "0.75rem" }}
                                  >
                                    &mdash;
                                  </span>
                                  <span className="font-medium">Action:</span>{" "}
                                  {todo.title}
                                  {todo.assignee_name && (
                                    <span style={{ color: "#999" }}>
                                      {" "}
                                      ({initials(todo.assignee_name)})
                                    </span>
                                  )}
                                  {todo.due_date && (
                                    <span style={{ color: "#999" }}>
                                      {" "}
                                      &mdash; {formatShortDate(todo.due_date)}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Recent activity summary (if no notes/todos, show activity) */}
                          {item.notes.length === 0 &&
                            item.todos.length === 0 &&
                            item.activities.length > 0 && (
                              <ul className="list-none p-0 m-0">
                                {item.activities.slice(0, 2).map((act, ai) => (
                                  <li
                                    key={ai}
                                    className="relative pl-4 mb-0.5"
                                    style={{ color: "#666" }}
                                  >
                                    <span
                                      className="absolute left-0"
                                      style={{ color: "#ccc", fontSize: "0.75rem" }}
                                    >
                                      &mdash;
                                    </span>
                                    {act.description || "Activity recorded"}
                                  </li>
                                ))}
                              </ul>
                            )}

                          {/* Status badge if not "new" */}
                          {item.card.status !== "new" && (
                            <p className="mt-1 text-xs italic" style={{ color: "#999" }}>
                              Status: {item.card.status.replace("_", " ")}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Uncategorised items */}
            {uncategorised.length > 0 && (
              <div className="mt-10">
                <div
                  className="pb-1 mb-5"
                  style={{ borderBottom: "1px solid #1a1a1a" }}
                >
                  <span
                    className="text-xs font-bold tracking-[0.2em] uppercase"
                    style={{ color: "#1a1a1a" }}
                  >
                    Other Items
                  </span>
                </div>
                {uncategorised.map((item, idx) => (
                  <div
                    key={item.card.id}
                    className="mb-6"
                    style={{ pageBreakInside: "avoid" }}
                  >
                    <div className="flex items-baseline gap-3 mb-1">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#1a1a1a", minWidth: "2.2rem" }}
                      >
                        {idx + 1}.
                      </span>
                      <span className="text-base font-semibold" style={{ color: "#1a1a1a" }}>
                        {item.card.title}
                      </span>
                    </div>
                    <div className="pl-9 text-sm" style={{ color: "#333" }}>
                      {item.card.summary && <p>{item.card.summary}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            <hr className="my-8" style={{ border: "none", borderTop: "1px solid #e8e8e8" }} />

            {/* Open Actions Table */}
            <div style={{ pageBreakBefore: "auto" }}>
              <h2
                className="text-xs font-bold tracking-[0.2em] uppercase mb-4"
                style={{ color: "#1a1a1a" }}
              >
                Open Actions
              </h2>
              {openTodos.length === 0 ? (
                <p className="text-sm italic" style={{ color: "#999" }}>
                  No open actions.
                </p>
              ) : (
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th
                        className="text-left text-xs font-semibold tracking-[0.12em] uppercase pb-1.5 px-2"
                        style={{ color: "#999", borderBottom: "1px solid #ccc" }}
                      >
                        Owner
                      </th>
                      <th
                        className="text-left text-xs font-semibold tracking-[0.12em] uppercase pb-1.5 px-2"
                        style={{ color: "#999", borderBottom: "1px solid #ccc" }}
                      >
                        Item
                      </th>
                      <th
                        className="text-left text-xs font-semibold tracking-[0.12em] uppercase pb-1.5 px-2"
                        style={{ color: "#999", borderBottom: "1px solid #ccc" }}
                      >
                        Context
                      </th>
                      <th
                        className="text-left text-xs font-semibold tracking-[0.12em] uppercase pb-1.5 px-2"
                        style={{ color: "#999", borderBottom: "1px solid #ccc" }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {openTodos.map((todo) => {
                      const isOverdue =
                        todo.due_date && daysFromNow(todo.due_date) < 0;
                      return (
                        <tr key={todo.id}>
                          <td
                            className="px-2 py-1 font-medium whitespace-nowrap align-top"
                            style={{ borderBottom: "1px solid #e8e8e8" }}
                          >
                            {todo.assignee_name
                              ? initials(todo.assignee_name)
                              : "—"}
                          </td>
                          <td
                            className="px-2 py-1 align-top"
                            style={{ borderBottom: "1px solid #e8e8e8" }}
                          >
                            {todo.title}
                          </td>
                          <td
                            className="px-2 py-1 align-top text-xs"
                            style={{
                              borderBottom: "1px solid #e8e8e8",
                              color: "#999",
                            }}
                          >
                            {todo.card_title || todo.category_name || ""}
                          </td>
                          <td
                            className="px-2 py-1 align-top text-xs italic"
                            style={{
                              borderBottom: "1px solid #e8e8e8",
                              color: isOverdue ? "#dc2626" : "#999",
                            }}
                          >
                            {isOverdue
                              ? `Overdue (${formatShortDate(todo.due_date!)})`
                              : todo.ball_in_court === "external"
                              ? "Waiting on external"
                              : todo.ball_in_court === "on_hold"
                              ? "On hold"
                              : todo.due_date
                              ? `Due ${formatShortDate(todo.due_date)}`
                              : "In progress"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Key Milestones */}
            {milestones.length > 0 && (
              <>
                <hr
                  className="my-8"
                  style={{ border: "none", borderTop: "1px solid #e8e8e8" }}
                />
                <div>
                  <h2
                    className="text-xs font-bold tracking-[0.2em] uppercase mb-4"
                    style={{ color: "#1a1a1a" }}
                  >
                    Key Milestones
                  </h2>
                  <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th
                          className="text-left text-xs font-semibold tracking-[0.12em] uppercase pb-1.5 px-2"
                          style={{ color: "#999", borderBottom: "1px solid #ccc" }}
                        >
                          Milestone
                        </th>
                        <th
                          className="text-left text-xs font-semibold tracking-[0.12em] uppercase pb-1.5 px-2"
                          style={{ color: "#999", borderBottom: "1px solid #ccc" }}
                        >
                          Target
                        </th>
                        <th
                          className="text-left text-xs font-semibold tracking-[0.12em] uppercase pb-1.5 px-2"
                          style={{ color: "#999", borderBottom: "1px solid #ccc" }}
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((m) => {
                        const days = m.target_date
                          ? daysFromNow(m.target_date)
                          : null;
                        return (
                          <tr key={m.id}>
                            <td
                              className="px-2 py-1 font-medium align-top"
                              style={{ borderBottom: "1px solid #e8e8e8" }}
                            >
                              {m.title}
                            </td>
                            <td
                              className="px-2 py-1 align-top"
                              style={{ borderBottom: "1px solid #e8e8e8" }}
                            >
                              {m.target_date
                                ? formatShortDate(m.target_date)
                                : "TBD"}
                              {days !== null && (
                                <span
                                  className="ml-1.5 text-xs italic"
                                  style={{
                                    color: days < 0 ? "#dc2626" : "#999",
                                  }}
                                >
                                  ({days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? "today" : `${days}d`})
                                </span>
                              )}
                            </td>
                            <td
                              className="px-2 py-1 align-top text-xs italic"
                              style={{
                                borderBottom: "1px solid #e8e8e8",
                                color: "#999",
                              }}
                            >
                              {m.status.replace("_", " ")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Footer */}
            <div
              className="mt-8 pt-3 text-right text-xs italic"
              style={{ borderTop: "1px solid #e8e8e8", color: "#999" }}
            >
              Prepared {today} &bull; Strictly Private &amp; Confidential
            </div>
          </div>
        </div>

        <div className="h-8 print:hidden" />
      </div>
    </>
  );
}
