import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { AddCategoryInline } from "./AddCategoryInline";
import { AddSubcategoryInline } from "./AddSubcategoryInline";
import { AddCardInline } from "./AddCardInline";
import { EditableCategoryName } from "./EditableCategoryName";
import { EditableSubcategoryName } from "./EditableSubcategoryName";
import { ViewToggle } from "./ViewToggle";

// ── Types ──────────────────────────────────────────────────────────────────────

interface WorkstreamRow {
  id: string;
  name: string;
}

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
}

interface SubcategoryRow {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}

interface CardRow {
  id: string;
  title: string;
  status: "new" | "in_progress" | "done" | "on_hold";
  category_id: string | null;
  subcategory_id: string | null;
  people_count: number;
}

interface ActivityItem {
  id: string;
  description: string | null;
  user_name: string | null;
  created_at: string;
}

interface OpenTodo {
  id: string;
  title: string;
  assignee_name: string | null;
  due_date: string | null;
  ball_in_court: string | null;
  bic_person_name: string | null;
  bic_org_name: string | null;
}

interface CategorySummary {
  id: string;
  name: string;
  card_count: number;
  open_todo_count: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

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
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDueDate(iso: string): string {
  const d = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Page ───────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ workstreamId: string }>;
  searchParams: Promise<{ category?: string; view?: string }>;
};

export default async function WorkstreamPage({ params, searchParams }: PageProps) {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  void session;

  const { workstreamId } = await params;
  const resolvedSearchParams = await searchParams;
  const expandCategoryId = resolvedSearchParams.category;
  const currentView = (resolvedSearchParams.view === "cards" ? "cards" : "briefing") as "briefing" | "cards";

  const db = getDb();

  const workstream = db
    .prepare("SELECT id, name FROM workstreams WHERE id = ?")
    .get(workstreamId) as WorkstreamRow | undefined;

  if (!workstream) {
    notFound();
  }

  // Get all categories for this workstream
  const categories = db
    .prepare(
      `SELECT id, name, sort_order
       FROM categories
       WHERE workstream_id = ? AND archived = 0
       ORDER BY sort_order ASC`
    )
    .all(workstreamId) as CategoryRow[];

  // For each category, get subcategories and cards
  const categoriesWithData = categories.map((cat) => {
    const subcategories = db
      .prepare(
        `SELECT id, category_id, name, sort_order
         FROM subcategories
         WHERE category_id = ? AND archived = 0
         ORDER BY sort_order ASC`
      )
      .all(cat.id) as SubcategoryRow[];

    // Direct cards (on the category, not in a subcategory)
    const directCards = db
      .prepare(
        `SELECT c.id, c.title, c.status, c.category_id, c.subcategory_id,
                (SELECT COUNT(*) FROM card_people WHERE card_people.card_id = c.id) AS people_count
         FROM cards c
         WHERE c.category_id = ? AND c.subcategory_id IS NULL AND c.archived = 0
         ORDER BY c.created_at DESC`
      )
      .all(cat.id) as CardRow[];

    const subcategoriesWithCards = subcategories.map((sub) => {
      const cards = db
        .prepare(
          `SELECT c.id, c.title, c.status, c.category_id, c.subcategory_id,
                  (SELECT COUNT(*) FROM card_people WHERE card_people.card_id = c.id) AS people_count
           FROM cards c
           WHERE c.subcategory_id = ? AND c.archived = 0
           ORDER BY c.created_at DESC`
        )
        .all(sub.id) as CardRow[];

      return { ...sub, cards };
    });

    // Total card count: direct cards + cards in subcategories
    const totalCardCount =
      directCards.length +
      subcategoriesWithCards.reduce((sum, sc) => sum + sc.cards.length, 0);

    return {
      ...cat,
      directCards,
      subcategories: subcategoriesWithCards,
      totalCardCount,
    };
  });

  // ── Briefing data ──────────────────────────────────────────────────────────

  // Key developments this week (last 7 days from activity_log)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString().replace("T", " ").slice(0, 19);

  const recentActivity = db
    .prepare(
      `SELECT a.id, a.description, u.name as user_name, a.created_at
       FROM activity_log a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.created_at >= ?
         AND (
           (a.entity_type = 'card' AND a.entity_id IN (
             SELECT c.id FROM cards c
             LEFT JOIN subcategories sc ON c.subcategory_id = sc.id
             LEFT JOIN categories cat ON (c.category_id = cat.id OR sc.category_id = cat.id)
             WHERE cat.workstream_id = ?
           ))
           OR (a.entity_type = 'category' AND a.entity_id IN (
             SELECT id FROM categories WHERE workstream_id = ?
           ))
           OR (a.entity_type = 'subcategory' AND a.entity_id IN (
             SELECT sc.id FROM subcategories sc
             JOIN categories cat ON sc.category_id = cat.id
             WHERE cat.workstream_id = ?
           ))
         )
       ORDER BY a.created_at DESC
       LIMIT 5`
    )
    .all(sevenDaysAgoISO, workstreamId, workstreamId, workstreamId) as ActivityItem[];

  // Open actions (todos linked to cards in this workstream, ball_in_court != 'external')
  const openActions = db
    .prepare(
      `SELECT DISTINCT t.id, t.title, u.name as assignee_name, t.due_date,
              t.ball_in_court, p.name as bic_person_name, o.name as bic_org_name
       FROM todos t
       JOIN card_todos ct ON ct.todo_id = t.id
       JOIN cards c ON ct.card_id = c.id AND c.archived = 0
       LEFT JOIN subcategories sc ON c.subcategory_id = sc.id
       LEFT JOIN categories cat ON (c.category_id = cat.id OR sc.category_id = cat.id)
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN people p ON t.ball_in_court_person_id = p.id
       LEFT JOIN organisations o ON p.organisation_id = o.id
       WHERE cat.workstream_id = ?
         AND t.archived = 0
         AND t.status = 'open'
         AND (t.ball_in_court IS NULL OR t.ball_in_court != 'external')
       ORDER BY t.due_date ASC`
    )
    .all(workstreamId) as OpenTodo[];

  // Waiting on external
  const waitingExternal = db
    .prepare(
      `SELECT DISTINCT t.id, t.title, u.name as assignee_name, t.due_date,
              t.ball_in_court, p.name as bic_person_name, o.name as bic_org_name
       FROM todos t
       JOIN card_todos ct ON ct.todo_id = t.id
       JOIN cards c ON ct.card_id = c.id AND c.archived = 0
       LEFT JOIN subcategories sc ON c.subcategory_id = sc.id
       LEFT JOIN categories cat ON (c.category_id = cat.id OR sc.category_id = cat.id)
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN people p ON t.ball_in_court_person_id = p.id
       LEFT JOIN organisations o ON p.organisation_id = o.id
       WHERE cat.workstream_id = ?
         AND t.archived = 0
         AND t.status = 'open'
         AND t.ball_in_court = 'external'
       ORDER BY t.due_date ASC`
    )
    .all(workstreamId) as OpenTodo[];

  // Categories summary
  const categorySummaries: CategorySummary[] = categories.map((cat) => {
    const cardCount = (
      db
        .prepare(
          `SELECT COUNT(DISTINCT c.id) as count FROM cards c
           LEFT JOIN subcategories sc ON c.subcategory_id = sc.id
           WHERE (c.category_id = ? OR sc.category_id = ?) AND c.archived = 0`
        )
        .get(cat.id, cat.id) as { count: number }
    ).count;

    const openTodoCount = (
      db
        .prepare(
          `SELECT COUNT(DISTINCT t.id) as count FROM todos t
           JOIN card_todos ct ON ct.todo_id = t.id
           JOIN cards c ON ct.card_id = c.id AND c.archived = 0
           LEFT JOIN subcategories sc ON c.subcategory_id = sc.id
           WHERE (c.category_id = ? OR sc.category_id = ?) AND t.archived = 0 AND t.status = 'open'`
        )
        .get(cat.id, cat.id) as { count: number }
    ).count;

    return {
      id: cat.id,
      name: cat.name,
      card_count: cardCount,
      open_todo_count: openTodoCount,
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4">
      {/* Back link + toggle */}
      <header className="pt-6 pb-5">
        <div className="flex items-center justify-between">
          <Link
            href="/browse"
            className="text-sm text-stone-400 hover:text-navy transition-colors"
          >
            &larr; Back to Browse
          </Link>
          <ViewToggle currentView={currentView} workstreamId={workstreamId} />
        </div>
        <h1 className="mt-2 font-heading text-xl text-navy">
          {workstream.name}
        </h1>
      </header>

      {/* ── Briefing View ─────────────────────────────────────────────── */}
      {currentView === "briefing" && (
        <div className="space-y-0">
          {/* Key Developments This Week */}
          <section className="border-t border-stone-200 py-5">
            <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
              Key Developments This Week
            </h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-stone-500">No recent activity.</p>
            ) : (
              <ul className="space-y-2">
                {recentActivity.map((act) => (
                  <li key={act.id} className="text-sm text-stone-700">
                    <span className="text-stone-400 mr-1.5">&bull;</span>
                    {act.description}
                    {act.user_name && (
                      <span className="text-stone-400">
                        {" "}&mdash; {act.user_name}
                      </span>
                    )}
                    <span className="text-stone-400">
                      , {timeAgo(act.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Open Actions */}
          <section className="border-t border-stone-200 py-5">
            <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
              Open Actions
            </h2>
            {openActions.length === 0 ? (
              <p className="text-sm text-stone-500">
                <span className="text-status-done mr-1.5">&#10003;</span>
                All clear — no open actions
              </p>
            ) : (
              <ul className="space-y-2">
                {openActions.map((todo) => (
                  <li key={todo.id} className="text-sm text-stone-700">
                    <Link
                      href={`/todos/${todo.id}`}
                      className="hover:text-navy transition-colors"
                    >
                      <span className="text-stone-400 mr-1.5">&#9744;</span>
                      <span className="font-medium text-navy">{todo.title}</span>
                    </Link>
                    {todo.assignee_name && (
                      <span className="text-stone-400">
                        {" "}&mdash; {todo.assignee_name}
                      </span>
                    )}
                    {todo.due_date && (
                      <span className="text-stone-400">
                        , {formatDueDate(todo.due_date)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Waiting on External */}
          {waitingExternal.length > 0 && (
            <section className="border-t border-stone-200 py-5">
              <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
                Waiting on External
              </h2>
              <ul className="space-y-2">
                {waitingExternal.map((todo) => (
                  <li key={todo.id} className="text-sm text-stone-700">
                    <Link
                      href={`/todos/${todo.id}`}
                      className="hover:text-navy transition-colors"
                    >
                      <span className="text-stone-400 mr-1.5">&#9676;</span>
                      <span className="font-medium text-navy">{todo.title}</span>
                    </Link>
                    {(todo.bic_person_name || todo.bic_org_name) && (
                      <span className="text-stone-400">
                        {" "}&mdash;{" "}
                        {todo.bic_org_name && todo.bic_person_name
                          ? `${todo.bic_org_name} (${todo.bic_person_name})`
                          : todo.bic_person_name || todo.bic_org_name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Categories Summary */}
          <section className="border-t border-stone-200 py-5">
            <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
              Categories
            </h2>
            {categorySummaries.length === 0 ? (
              <p className="text-sm text-stone-500">No categories yet.</p>
            ) : (
              <ul className="space-y-2">
                {categorySummaries.map((cat) => (
                  <li key={cat.id} className="text-sm">
                    <Link
                      href={`/browse/${workstreamId}?view=cards&category=${cat.id}`}
                      className="text-navy font-medium hover:underline"
                    >
                      {cat.name}
                    </Link>
                    <span className="text-stone-400">
                      {" "}&mdash; {cat.card_count} {cat.card_count === 1 ? "card" : "cards"}
                      {cat.open_todo_count > 0
                        ? `, ${cat.open_todo_count} open ${cat.open_todo_count === 1 ? "to-do" : "to-dos"}`
                        : ""}
                    </span>
                    {cat.open_todo_count === 0 && cat.card_count > 0 && (
                      <span className="text-status-done ml-1.5">
                        all clear &#10003;
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── Cards View ────────────────────────────────────────────────── */}
      {currentView === "cards" && <div className="space-y-4">
        {categoriesWithData.map((cat) => {
          const isExpanded = expandCategoryId === cat.id;

          return (
            <div
              key={cat.id}
              className="border-t border-stone-200 pt-4"
            >
              <CollapsibleSection
                title={<EditableCategoryName categoryId={cat.id} name={cat.name} />}
                count={cat.totalCardCount}
                defaultOpen={isExpanded}
                actions={
                  <div className="flex items-center gap-2">
                    <AddSubcategoryInline categoryId={cat.id} />
                    <AddCardInline
                      categoryId={cat.id}
                      subcategoryId={null}
                    />
                  </div>
                }
              >
                {/* Direct cards on category */}
                {cat.directCards.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {cat.directCards.map((card) => (
                      <CardThumbnail key={card.id} card={card} />
                    ))}
                  </div>
                )}

                {/* Subcategories */}
                <div className="space-y-3">
                  {cat.subcategories.map((sub) => (
                    <CollapsibleSection
                      key={sub.id}
                      title={<EditableSubcategoryName subcategoryId={sub.id} name={sub.name} />}
                      count={sub.cards.length}
                      defaultOpen={isExpanded && sub.cards.length > 0}
                      actions={
                        <AddCardInline
                          categoryId={cat.id}
                          subcategoryId={sub.id}
                        />
                      }
                    >
                      {sub.cards.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {sub.cards.map((card) => (
                            <CardThumbnail key={card.id} card={card} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-400">No cards yet.</p>
                      )}
                    </CollapsibleSection>
                  ))}
                </div>

                {cat.subcategories.length === 0 &&
                  cat.directCards.length === 0 && (
                    <p className="text-xs text-stone-400">
                      No cards yet — use + Card above to add your first entry.
                    </p>
                  )}
              </CollapsibleSection>
            </div>
          );
        })}

        {categoriesWithData.length === 0 && (
          <p className="py-4 text-sm text-stone-400">
            No categories yet. Create one to start organising this workstream.
          </p>
        )}

        {/* Add new category at the bottom */}
        <div className="border-t border-stone-200 pt-4">
          <AddCategoryInline workstreamId={workstream.id} />
        </div>
      </div>}

      <div className="h-8" />
    </div>
  );
}

// ── CardThumbnail ──────────────────────────────────────────────────────────────

function CardThumbnail({ card }: { card: CardRow }) {
  return (
    <Link
      href={`/cards/${card.id}`}
      className="block w-36 rounded-lg border border-stone-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="text-sm font-medium text-navy truncate">{card.title}</p>
      <div className="mt-1.5">
        <StatusBadge status={card.status} />
      </div>
      <p className="mt-1 text-xs text-stone-400">
        {card.people_count} {card.people_count === 1 ? "person" : "people"}
      </p>
    </Link>
  );
}
