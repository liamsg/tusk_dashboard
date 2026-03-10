import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddNoteForm } from "@/components/AddNoteForm";
import { ArchiveOrgButton } from "./ArchiveOrgButton";
import { EditOrgSummary } from "./EditOrgSummary";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OrgRow {
  id: string;
  name: string;
  website: string | null;
  summary: string | null;
  org_type: string | null;
  archived: number;
}

interface PersonRow {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
}

interface LinkedCardRow {
  id: string;
  title: string;
  status: string;
  category_name: string | null;
  subcategory_name: string | null;
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

// ── Helpers ────────────────────────────────────────────────────────────────────

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

const REF_ICONS: Record<string, string> = {
  email: "\uD83D\uDCE7",
  document: "\uD83D\uDCC4",
  folder: "\uD83D\uDCC1",
  call: "\uD83D\uDCDE",
  meeting: "\uD83D\uDCC5",
  link: "\uD83D\uDD17",
  other: "\uD83D\uDCCE",
};

// ── Page ───────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrgDetailPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  void session;

  const { id } = await params;
  const db = getDb();

  // Fetch organisation
  const org = db
    .prepare("SELECT * FROM organisations WHERE id = ? AND archived = 0")
    .get(id) as OrgRow | undefined;

  if (!org) {
    notFound();
  }

  // People in this org
  const people = db
    .prepare(
      `SELECT id, name, role, email
       FROM people
       WHERE organisation_id = ? AND archived = 0
       ORDER BY name`
    )
    .all(id) as PersonRow[];

  // Linked cards (via org_cards junction table)
  const linkedCards = db
    .prepare(
      `SELECT c.id, c.title, c.status,
              cat.name AS category_name,
              sub.name AS subcategory_name
       FROM cards c
       JOIN org_cards oc ON oc.card_id = c.id
       LEFT JOIN subcategories sub ON sub.id = c.subcategory_id
       LEFT JOIN categories cat ON cat.id = COALESCE(sub.category_id, c.category_id)
       WHERE oc.organisation_id = ? AND c.archived = 0`
    )
    .all(id) as LinkedCardRow[];

  // Notes on this organisation
  const notes = db
    .prepare(
      `SELECT n.id, n.content, n.created_at, u.name AS creator_name
       FROM notes n
       LEFT JOIN users u ON u.id = n.created_by
       WHERE n.entity_type = 'organisation' AND n.entity_id = ? AND n.archived = 0
       ORDER BY n.created_at DESC`
    )
    .all(id) as NoteRow[];

  // References linked to this organisation (via ref_entities)
  const refs = db
    .prepare(
      `SELECT r.id, r.ref_type, r.title, r.date
       FROM refs r
       JOIN ref_entities re ON re.ref_id = r.id
       WHERE re.entity_type = 'organisation' AND re.entity_id = ? AND r.archived = 0
       ORDER BY r.date DESC, r.created_at DESC`
    )
    .all(id) as RefRow[];

  // Activity log
  const activities = db
    .prepare(
      `SELECT al.id, al.description, u.name AS user_name, al.created_at
       FROM activity_log al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.entity_type = 'organisation' AND al.entity_id = ?
       ORDER BY al.created_at DESC`
    )
    .all(id) as ActivityRow[];

  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href="/people"
              className="text-sm text-stone-400 hover:text-navy transition-colors"
            >
              &larr; {org.name}
            </Link>
            <h1 className="mt-1 font-heading text-xl text-navy">
              {org.name}
            </h1>
          </div>
          <ArchiveOrgButton orgId={org.id} />
        </div>

        {/* Org type */}
        {org.org_type && (
          <p className="mt-1 text-sm text-stone-500">{org.org_type}</p>
        )}

        {/* Website */}
        {org.website && (
          <p className="mt-1 text-sm text-stone-500">
            <a
              href={
                org.website.startsWith("http")
                  ? org.website
                  : `https://${org.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-navy transition-colors"
            >
              {org.website}
            </a>
          </p>
        )}
      </header>

      {/* Summary */}
      <section className="border-t border-stone-200 py-4">
        <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
          Summary
        </h2>
        <EditOrgSummary orgId={org.id} initialSummary={org.summary} />
      </section>

      {/* People */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            People
          </h2>
        </div>
        {people.length === 0 ? (
          <p className="text-sm text-stone-400">No people in this organisation.</p>
        ) : (
          <ul className="space-y-2">
            {people.map((person) => (
              <li key={person.id} className="text-sm">
                <Link
                  href={`/people/${person.id}`}
                  className="text-navy hover:underline"
                >
                  {person.name}
                </Link>
                {person.role && (
                  <span className="text-stone-500">
                    {" "}
                    &middot; {person.role}
                  </span>
                )}
                {person.email && (
                  <span className="text-stone-500">
                    {" "}
                    &middot;{" "}
                    <a
                      href={`mailto:${person.email}`}
                      className="hover:text-navy transition-colors"
                    >
                      {person.email}
                    </a>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Linked Cards */}
      <section className="border-t border-stone-200 py-4">
        <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
          Linked Cards
        </h2>
        {linkedCards.length === 0 ? (
          <p className="text-sm text-stone-400">No linked cards.</p>
        ) : (
          <ul className="space-y-2">
            {linkedCards.map((card) => {
              const path = [card.category_name, card.subcategory_name]
                .filter(Boolean)
                .join(" > ");
              return (
                <li key={card.id} className="text-sm flex items-baseline gap-2">
                  <span className="text-stone-400">{"\uD83D\uDD17"}</span>
                  <div>
                    <Link
                      href={`/cards/${card.id}`}
                      className="text-navy hover:underline"
                    >
                      {card.title}
                    </Link>
                    {path && (
                      <span className="text-xs text-stone-400 ml-1.5">
                        {path}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Notes */}
      <section className="border-t border-stone-200 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
            Notes
          </h2>
          <AddNoteForm entityType="organisation" entityId={org.id} />
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

      {/* References */}
      {refs.length > 0 && (
        <section className="border-t border-stone-200 py-4">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400 mb-3">
            References
          </h2>
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
        </section>
      )}

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
