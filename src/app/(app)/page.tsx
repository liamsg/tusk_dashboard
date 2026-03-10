import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysFromNow(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"));
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function relativeDay(iso: string): string {
  const diff = daysFromNow(iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff <= 6) {
    const d = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"));
    return d.toLocaleDateString("en-GB", { weekday: "long" });
  }
  return formatDate(iso);
}

function timeAgo(iso: string): string {
  const now = new Date();
  const then = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function dateGroupLabel(iso: string): string {
  const diff = daysFromNow(iso.split("T")[0]);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return formatDate(iso.split("T")[0]);
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function weekFromNowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverdueTodo {
  id: string;
  title: string;
  due_date: string;
  assignee_name: string | null;
}

interface WeekTodo {
  id: string;
  title: string;
  due_date: string;
  assigned_to: string | null;
  assignee_name: string | null;
  ball_in_court: string | null;
  ball_in_court_person_id: string | null;
  bic_person_name: string | null;
  card_names: string | null;
}

interface Milestone {
  id: string;
  title: string;
  target_date: string | null;
  status: string;
}

interface ActivityRow {
  id: string;
  description: string | null;
  user_name: string | null;
  created_at: string;
}

interface WorkstreamRow {
  id: string;
  name: string;
  category_count: number;
  card_count: number;
  open_todo_count: number;
  overdue_todo_count: number;
  latest_activity: string | null;
}

interface FlaggedCard {
  id: string;
  title: string;
  flagger_name: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  const db = getDb();

  const today = todayISO();
  const weekEnd = weekFromNowISO();
  const firstName = session.user.name.split(" ")[0];

  // ── Queries ───────────────────────────────────────────────────────────────

  // Overdue todos
  const overdueTodos = db
    .prepare(
      `SELECT t.id, t.title, t.due_date, u.name as assignee_name
       FROM todos t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.archived = 0 AND t.status = 'open' AND t.due_date < ?
       ORDER BY t.due_date`
    )
    .all(today) as OverdueTodo[];

  // This week's todos with card names
  const weekTodos = db
    .prepare(
      `SELECT t.id, t.title, t.due_date, t.assigned_to, u.name as assignee_name,
              t.ball_in_court, t.ball_in_court_person_id, p.name as bic_person_name,
              GROUP_CONCAT(c.title, ', ') as card_names
       FROM todos t
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN people p ON t.ball_in_court_person_id = p.id
       LEFT JOIN card_todos ct ON ct.todo_id = t.id
       LEFT JOIN cards c ON ct.card_id = c.id AND c.archived = 0
       WHERE t.archived = 0 AND t.status = 'open'
         AND t.due_date >= ? AND t.due_date <= ?
       GROUP BY t.id
       ORDER BY t.due_date`
    )
    .all(today, weekEnd) as WeekTodo[];

  // All users (for grouping)
  const allUsers = db
    .prepare("SELECT id, name FROM users")
    .all() as { id: string; name: string }[];

  // Milestones
  const milestones = db
    .prepare(
      `SELECT id, title, target_date, status
       FROM milestones
       WHERE status != 'complete'
       ORDER BY target_date`
    )
    .all() as Milestone[];

  // Activity log
  const activities = db
    .prepare(
      `SELECT a.id, a.description, u.name as user_name, a.created_at
       FROM activity_log a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 10`
    )
    .all() as ActivityRow[];

  // Workstream summaries
  const workstreams = db.prepare("SELECT id, name FROM workstreams ORDER BY sort_order").all() as {
    id: string;
    name: string;
  }[];

  const workstreamSummaries: WorkstreamRow[] = workstreams.map((ws) => {
    const catCount = (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM categories WHERE workstream_id = ? AND archived = 0"
        )
        .get(ws.id) as { count: number }
    ).count;

    const cardCount = (
      db
        .prepare(
          `SELECT COUNT(DISTINCT c.id) as count FROM cards c
           LEFT JOIN subcategories sc ON c.subcategory_id = sc.id
           LEFT JOIN categories cat ON (c.category_id = cat.id OR sc.category_id = cat.id)
           WHERE cat.workstream_id = ? AND c.archived = 0`
        )
        .get(ws.id) as { count: number }
    ).count;

    const openTodoCount = (
      db
        .prepare(
          `SELECT COUNT(DISTINCT t.id) as count FROM todos t
           JOIN card_todos ct ON ct.todo_id = t.id
           JOIN cards c ON ct.card_id = c.id
           LEFT JOIN subcategories sc ON c.subcategory_id = sc.id
           LEFT JOIN categories cat ON (c.category_id = cat.id OR sc.category_id = cat.id)
           WHERE cat.workstream_id = ? AND c.archived = 0 AND t.archived = 0 AND t.status = 'open'`
        )
        .get(ws.id) as { count: number }
    ).count;

    const overdueTodoCount = (
      db
        .prepare(
          `SELECT COUNT(DISTINCT t.id) as count FROM todos t
           JOIN card_todos ct ON ct.todo_id = t.id
           JOIN cards c ON ct.card_id = c.id
           LEFT JOIN subcategories sc ON c.subcategory_id = sc.id
           LEFT JOIN categories cat ON (c.category_id = cat.id OR sc.category_id = cat.id)
           WHERE cat.workstream_id = ? AND c.archived = 0 AND t.archived = 0 AND t.status = 'open' AND t.due_date < ?`
        )
        .get(ws.id, today) as { count: number }
    ).count;

    const latestActivity = db
      .prepare(
        `SELECT a.description FROM activity_log a
         JOIN cards c ON a.entity_type = 'card' AND a.entity_id = c.id
         LEFT JOIN subcategories sc ON c.subcategory_id = sc.id
         LEFT JOIN categories cat ON (c.category_id = cat.id OR sc.category_id = cat.id)
         WHERE cat.workstream_id = ?
         ORDER BY a.created_at DESC
         LIMIT 1`
      )
      .get(ws.id) as { description: string } | undefined;

    return {
      id: ws.id,
      name: ws.name,
      category_count: catCount,
      card_count: cardCount,
      open_todo_count: openTodoCount,
      overdue_todo_count: overdueTodoCount,
      latest_activity: latestActivity?.description ?? null,
    };
  });

  // Flagged for discussion
  const flaggedCards = db
    .prepare(
      `SELECT c.id, c.title, u.name as flagger_name
       FROM cards c
       LEFT JOIN users u ON c.flagged_by = u.id
       WHERE c.flagged_for_discussion = 1 AND c.archived = 0
       ORDER BY c.updated_at DESC`
    )
    .all() as FlaggedCard[];

  // ── Group week todos by "ball in court" ───────────────────────────────────

  const myTodos = weekTodos.filter((t) => t.assigned_to === session.userId);
  const otherUserTodos: Record<string, WeekTodo[]> = {};
  const externalTodos = weekTodos.filter((t) => t.ball_in_court === "external");

  for (const user of allUsers) {
    if (user.id === session.userId) continue;
    const userTodos = weekTodos.filter(
      (t) => t.assigned_to === user.id && t.ball_in_court !== "external"
    );
    if (userTodos.length > 0) {
      otherUserTodos[user.name] = userTodos;
    }
  }

  // ── Group activities by date ──────────────────────────────────────────────

  const activityGroups: { label: string; items: ActivityRow[] }[] = [];
  for (const act of activities) {
    const label = dateGroupLabel(act.created_at);
    const existing = activityGroups.find((g) => g.label === label);
    if (existing) {
      existing.items.push(act);
    } else {
      activityGroups.push({ label, items: [act] });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="px-4 pt-6 pb-5 sm:px-6">
        <p className="text-xs uppercase tracking-widest text-stone-400 font-sans">
          {formatDate(today)}
        </p>
        <h1 className="mt-1 text-2xl font-heading text-navy">
          Good morning, {firstName}.
        </h1>
      </header>

      {/* ── Attention Needed ───────────────────────────────────────────── */}
      <section className="border-t border-stone-200 px-4 py-5 sm:px-6">
        <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
          Attention Needed
        </h2>
        {overdueTodos.length === 0 ? (
          <p className="text-sm text-stone-500">
            <span className="text-status-done mr-1.5">&#10003;</span>
            All clear — nothing overdue
          </p>
        ) : (
          <ul className="space-y-2.5">
            {overdueTodos.map((todo) => {
              const days = Math.abs(daysFromNow(todo.due_date));
              return (
                <li key={todo.id} className="text-sm">
                  <span className="text-amber-warn mr-1.5">&#9888;</span>
                  <span className="font-medium text-navy">{todo.title}</span>
                  <span className="text-amber-warn ml-1.5">
                    {days}d overdue
                  </span>
                  {todo.assignee_name && (
                    <span className="text-stone-400 ml-1.5">
                      &middot; {todo.assignee_name}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── This Week ──────────────────────────────────────────────────── */}
      <section className="border-t border-stone-200 px-4 py-5 sm:px-6">
        <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-4">
          This Week
        </h2>

        {weekTodos.length === 0 ? (
          <p className="text-sm text-stone-500">No upcoming to-dos this week.</p>
        ) : (
          <div className="space-y-5">
            {/* My todos */}
            {myTodos.length > 0 && (
              <div>
                <h3 className="text-xs font-sans font-medium uppercase tracking-wide text-navy-light mb-2">
                  Waiting on you ({firstName})
                </h3>
                <ul className="space-y-2">
                  {myTodos.map((todo) => (
                    <TodoLine key={todo.id} todo={todo} />
                  ))}
                </ul>
              </div>
            )}

            {/* Other users' todos */}
            {Object.entries(otherUserTodos).map(([name, todos]) => (
              <div key={name}>
                <h3 className="text-xs font-sans font-medium uppercase tracking-wide text-navy-light mb-2">
                  Waiting on {name}
                </h3>
                <ul className="space-y-2">
                  {todos.map((todo) => (
                    <TodoLine key={todo.id} todo={todo} />
                  ))}
                </ul>
              </div>
            ))}

            {/* External / third party */}
            {externalTodos.length > 0 && (
              <div>
                <h3 className="text-xs font-sans font-medium uppercase tracking-wide text-navy-light mb-2">
                  Waiting on third parties
                </h3>
                <ul className="space-y-2">
                  {externalTodos.map((todo) => (
                    <TodoLine key={todo.id} todo={todo} showPerson />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Key Milestones ─────────────────────────────────────────────── */}
      {milestones.length > 0 && (
        <section className="border-t border-stone-200 px-4 py-5 sm:px-6">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Key Milestones
          </h2>
          <ul className="space-y-2">
            {milestones.map((ms) => {
              const days = ms.target_date ? daysFromNow(ms.target_date) : null;
              return (
                <li key={ms.id} className="text-sm flex items-baseline gap-2">
                  <span className="font-medium text-navy">{ms.title}</span>
                  <span className="flex-1 border-b border-dotted border-stone-300" />
                  {ms.target_date ? (
                    <span className="text-stone-500 whitespace-nowrap tabular-nums">
                      {formatDate(ms.target_date)}{" "}
                      <span className="text-stone-400">
                        ({days !== null && days >= 0 ? `${days}d` : `${Math.abs(days!)}d ago`})
                      </span>
                    </span>
                  ) : (
                    <span className="text-stone-400">No date set</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── What's Been Happening ──────────────────────────────────────── */}
      {activities.length > 0 && (
        <section className="border-t border-stone-200 px-4 py-5 sm:px-6">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
            {"What's Been Happening"}
          </h2>
          <div className="space-y-4">
            {activityGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-sans font-medium text-stone-400 uppercase tracking-wide mb-1.5">
                  {group.label}
                </p>
                <ul className="space-y-1.5">
                  {group.items.map((act) => (
                    <li key={act.id} className="text-sm text-navy">
                      {act.description || "Activity recorded"}
                      {act.user_name && (
                        <span className="text-stone-400 ml-1.5">
                          — {act.user_name}
                        </span>
                      )}
                      <span className="text-stone-300 ml-1.5 text-xs">
                        {timeAgo(act.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Workstream Summaries ───────────────────────────────────────── */}
      {workstreamSummaries.length > 0 && (
        <section className="border-t border-stone-200 px-4 py-5 sm:px-6">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Workstreams
          </h2>
          <div className="space-y-4">
            {workstreamSummaries.map((ws) => (
              <div
                key={ws.id}
                className="rounded-lg bg-white/60 border border-stone-100 px-4 py-3"
              >
                <p className="text-sm font-medium text-navy">{ws.name}</p>
                <p className="text-xs text-stone-500 mt-1 tabular-nums">
                  {ws.category_count} {ws.category_count === 1 ? "category" : "categories"}
                  {" \u00B7 "}
                  {ws.card_count} {ws.card_count === 1 ? "card" : "cards"}
                  {" \u00B7 "}
                  {ws.open_todo_count} open {ws.open_todo_count === 1 ? "to-do" : "to-dos"}
                </p>
                {ws.overdue_todo_count > 0 && (
                  <p className="text-xs text-amber-warn mt-0.5">
                    &#9888; {ws.overdue_todo_count} overdue
                  </p>
                )}
                {ws.latest_activity && (
                  <p className="text-xs text-stone-400 mt-1.5 italic">
                    Latest: {ws.latest_activity}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Flagged for Discussion ─────────────────────────────────────── */}
      {flaggedCards.length > 0 && (
        <section className="border-t border-stone-200 px-4 py-5 sm:px-6">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Flagged for Discussion
          </h2>
          <ul className="space-y-2">
            {flaggedCards.map((card) => (
              <li key={card.id} className="text-sm flex items-baseline gap-2">
                <span className="text-amber-warn text-xs">&#9873;</span>
                <span className="font-medium text-navy">{card.title}</span>
                {card.flagger_name && (
                  <span className="text-stone-400 text-xs">
                    — flagged by {card.flagger_name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Quick Links (bottom nav for context) ──────────────────────── */}
      <section className="border-t border-stone-200 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/browse", label: "Browse" },
            { href: "/todos", label: "To-Dos" },
            { href: "/people", label: "People" },
            { href: "/meeting-notes", label: "Notes" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-navy-light transition-colors hover:bg-cream-dark hover:text-navy"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom spacer for mobile bottom nav */}
      <div className="h-4" />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TodoLine({ todo, showPerson }: { todo: WeekTodo; showPerson?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border border-stone-300 bg-white" />
      <div className="min-w-0">
        <span className="text-navy">{todo.title}</span>
        {todo.due_date && (
          <span className="text-stone-400 ml-1.5 text-xs">
            {relativeDay(todo.due_date)}
          </span>
        )}
        {showPerson && todo.bic_person_name && (
          <span className="text-stone-400 ml-1.5 text-xs">
            &middot; {todo.bic_person_name}
          </span>
        )}
        {todo.card_names && (
          <p className="text-xs text-stone-400 mt-0.5 truncate">
            {todo.card_names}
          </p>
        )}
      </div>
    </li>
  );
}
