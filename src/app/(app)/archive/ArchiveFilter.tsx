"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { RestoreButton } from "./RestoreButton";

const ENTITY_LINKS: Record<string, (id: string) => string> = {
  card: (id) => `/cards/${id}`,
  todo: (id) => `/todos/${id}`,
  person: (id) => `/people/${id}`,
  organisation: (id) => `/people/org/${id}`,
  meeting_note: (id) => `/meeting-notes/${id}`,
};

interface ArchivedItem {
  id: string;
  name: string;
  entityType: string;
  entityLabel: string;
  apiPath: string;
  archivedBy: string | null;
  archivedAt: string | null;
}

interface ArchiveFilterProps {
  items: ArchivedItem[];
}

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "card", label: "Cards" },
  { value: "todo", label: "To-Dos" },
  { value: "person", label: "People" },
  { value: "organisation", label: "Organisations" },
  { value: "meeting_note", label: "Meeting Notes" },
  { value: "category", label: "Categories" },
] as const;

export function ArchiveFilter({ items }: ArchiveFilterProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return items.filter((item) => {
      if (typeFilter && item.entityType !== typeFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.entityLabel.toLowerCase().includes(q) ||
        (item.archivedBy && item.archivedBy.toLowerCase().includes(q))
      );
    });
  }, [search, typeFilter, items]);

  return (
    <div>
      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-stone-200 bg-white px-2 py-2 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-sm text-stone-400 py-8 text-center">
          {search || typeFilter
            ? "No matching archived items."
            : "No archived items."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={`${item.entityType}-${item.id}`}
              className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-navy">
                  {ENTITY_LINKS[item.entityType] ? (
                    <Link
                      href={ENTITY_LINKS[item.entityType](item.id)}
                      className="hover:underline hover:text-navy-light transition-colors"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}{" "}
                  <span className="text-stone-400">({item.entityLabel})</span>
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {item.archivedBy && (
                    <span>Archived by {item.archivedBy}</span>
                  )}
                  {item.archivedBy && item.archivedAt && (
                    <span> &middot; </span>
                  )}
                  {item.archivedAt && <span>{item.archivedAt}</span>}
                </p>
              </div>
              <RestoreButton
                entityType={item.entityType}
                entityId={item.id}
                apiPath={item.apiPath}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
