"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

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

export interface EnrichedTodo {
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
  linked_cards: LinkedCard[];
  linked_people: LinkedPerson[];
}

export interface TodoGroup {
  key: string;
  label: string;
  todos: EnrichedTodo[];
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

// ── Reorder API call ───────────────────────────────────────────────────────────

async function swapSortOrders(
  idA: string,
  sortOrderA: number,
  idB: string,
  sortOrderB: number
) {
  await Promise.all([
    fetch(`/api/todos/${idA}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sort_order: sortOrderB }),
    }),
    fetch(`/api/todos/${idB}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sort_order: sortOrderA }),
    }),
  ]);
}

// ── TodoItem ───────────────────────────────────────────────────────────────────

function TodoItem({
  todo,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  todo: EnrichedTodo;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isDone = todo.status === "done";
  const dateInfo = todo.due_date ? formatRelativeDate(todo.due_date) : null;

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
      {/* Reorder buttons */}
      <span className="flex flex-col items-center mt-0.5 flex-shrink-0 leading-none text-sm select-none">
        {!isFirst ? (
          <button
            type="button"
            onClick={onMoveUp}
            className="text-stone-400 hover:text-stone-600 leading-none"
            aria-label="Move up"
          >
            &#9650;
          </button>
        ) : (
          <span className="invisible leading-none">&#9650;</span>
        )}
        {!isLast ? (
          <button
            type="button"
            onClick={onMoveDown}
            className="text-stone-400 hover:text-stone-600 leading-none"
            aria-label="Move down"
          >
            &#9660;
          </button>
        ) : (
          <span className="invisible leading-none">&#9660;</span>
        )}
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

// ── DoneTodoItem (no reorder buttons, uses drag handle placeholder like original) ──

function DoneTodoItem({ todo }: { todo: EnrichedTodo }) {
  const dateInfo = todo.due_date ? formatRelativeDate(todo.due_date) : null;

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
      {/* Spacer matching reorder button width */}
      <span className="text-stone-300 mt-0.5 select-none text-sm leading-none">
        &#x2261;
      </span>

      {/* Checkbox area */}
      <span className="mt-0.5 flex-shrink-0">
        <span className="text-green-500 text-sm">&#10003;</span>
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <Link
            href={`/todos/${todo.id}`}
            className="text-sm hover:underline text-stone-400 line-through"
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

        {categoryPath && (
          <p className="text-xs text-stone-400 mt-0.5">{categoryPath}</p>
        )}

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

// ── TodoGroup Component ────────────────────────────────────────────────────────

function TodoGroupSection({
  group,
  todos,
  onSwap,
}: {
  group: TodoGroup;
  todos: EnrichedTodo[];
  onSwap: (groupKey: string, index: number, direction: "up" | "down") => void;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-2">
        {group.label}
      </h2>
      <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
        {todos.map((todo, index) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            isFirst={index === 0}
            isLast={index === todos.length - 1}
            onMoveUp={() => onSwap(group.key, index, "up")}
            onMoveDown={() => onSwap(group.key, index, "down")}
          />
        ))}
      </div>
    </section>
  );
}

// ── Main TodoList Component ────────────────────────────────────────────────────

export default function TodoList({
  groups,
  doneTodos: initialDoneTodos,
  hasOpenTodos,
  currentUserId,
}: {
  groups: TodoGroup[];
  doneTodos: EnrichedTodo[];
  hasOpenTodos: boolean;
  currentUserId?: string;
}) {
  const [viewMode, setViewMode] = useState<"my" | "all">("my");
  // Build a map of group key -> todos for local state
  const buildGroupState = useCallback((gs: TodoGroup[]) => {
    const state: Record<string, EnrichedTodo[]> = {};
    for (const g of gs) {
      state[g.key] = [...g.todos];
    }
    return state;
  }, []);

  const [groupState, setGroupState] = useState(() => buildGroupState(groups));
  const [doneTodos, setDoneTodos] = useState(initialDoneTodos);

  // Sync state when server data changes (e.g. after router.refresh())
  const [prevGroups, setPrevGroups] = useState(groups);
  const [prevDoneTodos, setPrevDoneTodos] = useState(initialDoneTodos);
  if (groups !== prevGroups) {
    setPrevGroups(groups);
    setGroupState(buildGroupState(groups));
  }
  if (initialDoneTodos !== prevDoneTodos) {
    setPrevDoneTodos(initialDoneTodos);
    setDoneTodos(initialDoneTodos);
  }

  const handleSwap = useCallback(
    (groupKey: string, index: number, direction: "up" | "down") => {
      setGroupState((prev) => {
        const todos = [...prev[groupKey]];
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= todos.length) return prev;

        const itemA = todos[index];
        const itemB = todos[swapIndex];

        // Swap sort_order values
        const sortOrderA = itemA.sort_order;
        const sortOrderB = itemB.sort_order;

        // Optimistic UI: swap items and their sort_order values
        const newA = { ...itemA, sort_order: sortOrderB };
        const newB = { ...itemB, sort_order: sortOrderA };
        todos[index] = newB;
        todos[swapIndex] = newA;

        // Fire API calls (no await -- optimistic)
        swapSortOrders(itemA.id, sortOrderA, itemB.id, sortOrderB);

        return { ...prev, [groupKey]: todos };
      });
    },
    []
  );

  // Filter groups based on view mode
  const visibleGroups = viewMode === "all" || !currentUserId
    ? groups
    : groups.filter((group) => {
        // In "My View", show groups where the user is the assignee, plus external and on_hold
        if (group.key === "external" || group.key === "on_hold") return true;
        // "us-{assigneeName}" groups: check if todos in this group are assigned to the current user
        const todos = groupState[group.key];
        if (!todos || todos.length === 0) return false;
        return todos.some((t) => t.assigned_to === currentUserId);
      });

  const visibleDoneTodos = viewMode === "all" || !currentUserId
    ? doneTodos
    : doneTodos.filter((t) => t.assigned_to === currentUserId);

  return (
    <>
      {/* My View / All toggle */}
      {currentUserId && (
        <div className="flex items-center gap-0 mb-4 rounded-md overflow-hidden border border-stone-200 w-fit">
          <button
            type="button"
            onClick={() => setViewMode("my")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "my"
                ? "bg-navy text-white"
                : "bg-white text-stone-500 hover:text-navy"
            }`}
          >
            My View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "all"
                ? "bg-navy text-white"
                : "bg-white text-stone-500 hover:text-navy"
            }`}
          >
            All
          </button>
        </div>
      )}

      {/* Open groups */}
      {visibleGroups.map((group) => {
        const todos = groupState[group.key];
        if (!todos || todos.length === 0) return null;
        return (
          <TodoGroupSection
            key={group.key}
            group={group}
            todos={todos}
            onSwap={handleSwap}
          />
        );
      })}

      {/* No open todos */}
      {visibleGroups.every((g) => !groupState[g.key] || groupState[g.key].length === 0) && !hasOpenTodos && (
        <p className="text-sm text-stone-400 py-8 text-center">
          No open to-dos. Click + New to create one.
        </p>
      )}

      {/* Done */}
      {visibleDoneTodos.length > 0 && (
        <details className="mb-6">
          <summary className="cursor-pointer text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-2 list-none flex items-center gap-1 select-none">
            Done ({visibleDoneTodos.length})
            <span className="text-stone-300 ml-1">&#9660;</span>
          </summary>
          <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
            {visibleDoneTodos.map((todo) => (
              <DoneTodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}
