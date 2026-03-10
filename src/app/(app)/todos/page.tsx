import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { CreateTodoForm } from "./CreateTodoForm";

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
  assignee_name: string | null;
  bic_person_name: string | null;
  bic_person_email: string | null;
  bic_org_name: string | null;
  note_count: number;
  ref_count: number;
}

interface LinkedCard {
  id: string;
  title: string;
  category_name: string | null;
  subcategory_name: string | null;
}

interface LinkedPerson {
  id: string;
  name: string;
  email: string | null;
  organisation_name: string | null;
}

interface EnrichedTodo extends TodoRow {
  linked_cards: LinkedCard[];
  linked_people: LinkedPerson[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function TodosPage() {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  const db = getDb();

  // Fetch all non-archived todos with enriched data
  const rows = db
    .prepare(
      `SELECT t.*,
              u.name AS assignee_name,
              bic.name AS bic_person_name,
              bic.email AS bic_person_email,
              org.name AS bic_org_name,
              (SELECT COUNT(*) FROM notes
               WHERE notes.entity_type = 'todo' AND notes.entity_id = t.id AND notes.archived = 0) AS note_count,
              (SELECT COUNT(*) FROM todo_refs tr
               JOIN refs r ON r.id = tr.ref_id
               WHERE tr.todo_id = t.id AND r.archived = 0) AS ref_count
       FROM todos t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN people bic ON bic.id = t.ball_in_court_person_id
       LEFT JOIN organisations org ON org.id = bic.organisation_id
       WHERE t.archived = 0
       ORDER BY t.sort_order ASC`
    )
    .all() as TodoRow[];

  // Enrich each todo with linked cards and people
  const todos: EnrichedTodo[] = rows.map((todo) => {
    const linked_cards = db
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
      .all(todo.id) as LinkedCard[];

    const linked_people = db
      .prepare(
        `SELECT p.id, p.name, p.email,
                o.name AS organisation_name
         FROM people p
         JOIN todo_people tp ON tp.person_id = p.id
         LEFT JOIN organisations o ON o.id = p.organisation_id
         WHERE tp.todo_id = ?`
      )
      .all(todo.id) as LinkedPerson[];

    return { ...todo, linked_cards, linked_people };
  });

  // All users for display and forms
  const users = db
    .prepare("SELECT id, name FROM users ORDER BY name ASC")
    .all() as { id: string; name: string }[];

  // Split into open and done
  const openTodos = todos.filter((t) => t.status !== "done");
  const doneTodos = todos.filter((t) => t.status === "done");

  // Group open todos by ball-in-court
  // "us" todos grouped by assigned_to user, then "external", then "on_hold"
  const usTodos = openTodos.filter(
    (t) => t.ball_in_court === "us" || !t.ball_in_court
  );
  const externalTodos = openTodos.filter(
    (t) => t.ball_in_court === "external"
  );
  const onHoldTodos = openTodos.filter((t) => t.ball_in_court === "on_hold");

  // Group "us" todos by assignee
  const usByAssignee = new Map<string, EnrichedTodo[]>();
  for (const todo of usTodos) {
    const key = todo.assignee_name || "Unassigned";
    if (!usByAssignee.has(key)) {
      usByAssignee.set(key, []);
    }
    usByAssignee.get(key)!.push(todo);
  }

  return (
    <div className="mx-auto max-w-3xl px-4">
      {/* Header */}
      <header className="pt-6 pb-4 flex items-center justify-between">
        <h1 className="font-heading text-xl text-navy">To-Dos</h1>
        <CreateTodoForm users={users} />
      </header>

      {/* "Us" groups by assignee */}
      {Array.from(usByAssignee.entries()).map(([assigneeName, groupTodos]) => (
        <section key={assigneeName} className="mb-6">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-2">
            Waiting on you ({assigneeName})
          </h2>
          <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
            {groupTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </section>
      ))}

      {/* External */}
      {externalTodos.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-2">
            Waiting on Third Parties
          </h2>
          <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
            {externalTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </section>
      )}

      {/* On Hold */}
      {onHoldTodos.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-2">
            On Hold
          </h2>
          <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
            {onHoldTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </section>
      )}

      {/* No open todos */}
      {openTodos.length === 0 && (
        <p className="text-sm text-stone-400 py-8 text-center">
          No open to-dos. Click + New to create one.
        </p>
      )}

      {/* Done */}
      {doneTodos.length > 0 && (
        <DoneSection todos={doneTodos} />
      )}

      <div className="h-8" />
    </div>
  );
}

// ── TodoItem ───────────────────────────────────────────────────────────────────

function TodoItem({ todo }: { todo: EnrichedTodo }) {
  const isDone = todo.status === "done";
  const dateInfo = todo.due_date ? formatRelativeDate(todo.due_date) : null;

  // Build category path from linked cards
  const categoryPath = todo.linked_cards
    .map((c) => {
      const parts: string[] = [];
      if (c.category_name) parts.push(c.category_name);
      if (c.subcategory_name) parts.push(c.subcategory_name);
      return parts.join(" > ");
    })
    .filter(Boolean)
    .join(", ");

  return (
    <div className="px-4 py-3 flex items-start gap-3">
      {/* Drag handle (visual only) */}
      <span className="text-stone-300 mt-0.5 cursor-grab select-none text-sm leading-none">
        &#x2261;
      </span>

      {/* Checkbox area */}
      <span className="mt-0.5 flex-shrink-0">
        {isDone ? (
          <span className="text-green-500 text-sm">&#10003;</span>
        ) : (
          <span className="inline-block h-4 w-4 rounded border border-stone-300 bg-white" />
        )}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <Link
            href={`/todos/${todo.id}`}
            className={`text-sm hover:underline ${
              isDone ? "text-stone-400 line-through" : "text-navy font-medium"
            }`}
          >
            {todo.title}
          </Link>
          {dateInfo && (
            <span
              className={`text-xs whitespace-nowrap flex-shrink-0 ${
                dateInfo.overdue
                  ? "text-red-500 font-medium"
                  : "text-stone-400"
              }`}
            >
              {dateInfo.label}
            </span>
          )}
        </div>

        {/* Category path from linked cards */}
        {categoryPath && (
          <p className="text-xs text-stone-400 mt-0.5">{categoryPath}</p>
        )}

        {/* Linked people */}
        {todo.linked_people.length > 0 && (
          <p className="text-xs text-stone-500 mt-0.5">
            {todo.linked_people.map((p, i) => (
              <span key={p.id}>
                {i > 0 && " \u00B7 "}
                {p.name}
                {p.email && (
                  <>
                    {" "}
                    <a
                      href={`mailto:${p.email}`}
                      className="text-stone-400 hover:text-navy"
                    >
                      {p.email}
                    </a>
                  </>
                )}
              </span>
            ))}
          </p>
        )}

        {/* Ball-in-court person for external */}
        {todo.ball_in_court === "external" && todo.bic_person_name && (
          <p className="text-xs text-stone-400 mt-0.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mr-1" />
            {todo.bic_person_name}
            {todo.bic_org_name && ` @ ${todo.bic_org_name}`}
            {todo.bic_person_email && (
              <>
                {" \u00B7 "}
                <a
                  href={`mailto:${todo.bic_person_email}`}
                  className="hover:text-navy"
                >
                  {todo.bic_person_email}
                </a>
              </>
            )}
          </p>
        )}

        {/* Ref and note counts */}
        {(todo.ref_count > 0 || todo.note_count > 0) && (
          <p className="text-xs text-stone-400 mt-1 flex items-center gap-3">
            {todo.ref_count > 0 && (
              <span>
                {"\uD83D\uDCE7"} {todo.ref_count} ref
                {todo.ref_count !== 1 ? "s" : ""}
              </span>
            )}
            {todo.note_count > 0 && (
              <span>
                {"\uD83D\uDCAC"} {todo.note_count} note
                {todo.note_count !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

// ── DoneSection (collapsed by default, uses details/summary) ───────────────────

function DoneSection({ todos }: { todos: EnrichedTodo[] }) {
  return (
    <details className="mb-6">
      <summary className="cursor-pointer text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-2 list-none flex items-center gap-1 select-none">
        Done ({todos.length})
        <span className="text-stone-300 ml-1">&#9660;</span>
      </summary>
      <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </div>
    </details>
  );
}
