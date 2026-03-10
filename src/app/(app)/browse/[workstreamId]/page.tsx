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
  const { category: expandCategoryId } = await searchParams;

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

  return (
    <div className="mx-auto max-w-3xl px-4">
      {/* Back link */}
      <header className="pt-6 pb-5">
        <Link
          href="/browse"
          className="text-sm text-stone-400 hover:text-navy transition-colors"
        >
          &larr; Back to Browse
        </Link>
        <h1 className="mt-2 font-heading text-xl text-navy">
          {workstream.name}
        </h1>
      </header>

      {/* Categories */}
      <div className="space-y-4">
        {categoriesWithData.map((cat) => {
          const isExpanded = expandCategoryId === cat.id;

          return (
            <div
              key={cat.id}
              className="border-t border-stone-200 pt-4"
            >
              <CollapsibleSection
                title={cat.name}
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
                      title={sub.name}
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
                      No subcategories or cards yet.
                    </p>
                  )}
              </CollapsibleSection>
            </div>
          );
        })}

        {/* Add new category at the bottom */}
        <div className="border-t border-stone-200 pt-4">
          <AddCategoryInline workstreamId={workstream.id} />
        </div>
      </div>

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
