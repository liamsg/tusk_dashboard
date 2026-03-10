"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface MeetingNote {
  id: string;
  title: string;
  date: string;
  dateFormatted: string;
  content: string;
  preview: string;
  attendees: string[];
  tags: string[];
}

interface MeetingNotesSearchProps {
  notes: MeetingNote[];
  allTags: string[];
}

export function MeetingNotesSearch({ notes, allTags }: MeetingNotesSearchProps) {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return notes.filter((note) => {
      // Tag filter
      if (selectedTag && !note.tags.includes(selectedTag)) return false;

      // Text search
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.tags.some((t) => t.toLowerCase().includes(q)) ||
        note.attendees.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [search, selectedTag, notes]);

  return (
    <div>
      {/* Search + Tag filter */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
        {allTags.length > 0 && (
          <select
            value={selectedTag || ""}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="rounded border border-stone-200 bg-white px-2 py-2 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          >
            <option value="">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-sm text-stone-400 py-8 text-center">
          {search || selectedTag ? "No matching notes." : "No meeting notes yet."}
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((note) => (
            <Link
              key={note.id}
              href={`/meeting-notes/${note.id}`}
              className="block rounded-lg border border-stone-200 bg-white p-4 hover:border-stone-300 transition-colors"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-stone-400">
                  {note.dateFormatted}
                </span>
                <span className="text-stone-300">&mdash;</span>
                <span className="font-medium text-navy">{note.title}</span>
              </div>

              {note.attendees.length > 0 && (
                <p className="mt-1 text-sm text-stone-500">
                  {note.attendees.join(" \u00B7 ")}
                </p>
              )}

              {note.preview && (
                <p className="mt-1.5 text-sm text-stone-600 italic leading-relaxed line-clamp-2">
                  &ldquo;{note.preview}&rdquo;
                </p>
              )}

              {note.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
