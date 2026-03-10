import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { AddCategoryForm } from "./AddCategoryForm";

// ── Types ──────────────────────────────────────────────────────────────────────

interface WorkstreamRow {
  id: string;
  name: string;
}

interface CategoryRow {
  id: string;
  workstream_id: string;
  name: string;
  sort_order: number;
  card_count: number;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function BrowsePage() {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  void session;

  const db = getDb();

  const workstreams = db
    .prepare("SELECT id, name FROM workstreams ORDER BY sort_order")
    .all() as WorkstreamRow[];

  const workstreamsWithCategories = workstreams.map((ws) => {
    const categories = db
      .prepare(
        `SELECT c.id, c.workstream_id, c.name, c.sort_order,
                (SELECT COUNT(*) FROM cards
                 WHERE (cards.category_id = c.id
                        OR cards.subcategory_id IN (SELECT id FROM subcategories WHERE category_id = c.id))
                   AND cards.archived = 0
                ) AS card_count
         FROM categories c
         WHERE c.workstream_id = ? AND c.archived = 0
         ORDER BY c.sort_order ASC`
      )
      .all(ws.id) as CategoryRow[];

    return { ...ws, categories };
  });

  return (
    <div className="mx-auto max-w-3xl px-4">
      {/* Header */}
      <header className="pt-6 pb-5">
        <h1 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
          Browse
        </h1>
      </header>

      {/* Workstream sections */}
      <div className="space-y-8">
        {workstreamsWithCategories.map((ws) => (
          <section key={ws.id} className="border-t border-stone-200 pt-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg text-navy">{ws.name}</h2>
              <AddCategoryForm workstreamId={ws.id} />
            </div>

            {ws.categories.length === 0 ? (
              <p className="text-sm text-stone-400">
                No categories yet. Add one to get started.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {ws.categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/browse/${ws.id}?category=${cat.id}`}
                      className="flex items-baseline gap-2 rounded-md px-3 py-2 text-sm text-navy hover:bg-white/60 transition-colors group"
                    >
                      <span className="group-hover:underline">
                        {cat.name}
                      </span>
                      <span className="text-stone-400 text-xs">
                        &mdash; {cat.card_count}{" "}
                        {cat.card_count === 1 ? "card" : "cards"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {workstreams.length === 0 && (
          <p className="text-sm text-stone-400 py-8 text-center">
            No workstreams found. Create one to get started.
          </p>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}
