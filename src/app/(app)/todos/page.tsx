import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { CreateTodoForm } from "./CreateTodoForm";
import TodoList from "./TodoList";
import type { EnrichedTodo, TodoGroup } from "./TodoList";

// ── Types (used locally for DB query casting) ──────────────────────────────────

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

  // Build ordered groups for the client component
  const groups: TodoGroup[] = [];

  for (const [assigneeName, groupTodos] of usByAssignee.entries()) {
    groups.push({
      key: `us-${assigneeName}`,
      label: `Waiting on you (${assigneeName})`,
      todos: groupTodos,
    });
  }

  if (externalTodos.length > 0) {
    groups.push({
      key: "external",
      label: "Waiting on Third Parties",
      todos: externalTodos,
    });
  }

  if (onHoldTodos.length > 0) {
    groups.push({
      key: "on_hold",
      label: "On Hold",
      todos: onHoldTodos,
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4">
      {/* Header */}
      <header className="pt-6 pb-4 flex items-center justify-between">
        <h1 className="font-heading text-xl text-navy">To-Dos</h1>
        <CreateTodoForm users={users} />
      </header>

      <TodoList
        groups={groups}
        doneTodos={doneTodos}
        hasOpenTodos={openTodos.length > 0}
      />

      <div className="h-8" />
    </div>
  );
}

