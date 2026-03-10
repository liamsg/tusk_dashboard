"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

interface MeetingNote {
  id: string;
  title: string;
  date: string;
}

interface LinkMeetingNoteInlineProps {
  cardId: string;
  linkedIds: string[];
}

export function LinkMeetingNoteInline({
  cardId,
  linkedIds,
}: LinkMeetingNoteInlineProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/meeting-notes")
      .then((res) => res.json())
      .then((data: MeetingNote[]) => {
        const available = data.filter((n) => !linkedIds.includes(n.id));
        setNotes(available);
      })
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [open, linkedIds]);

  const handleLink = async (noteId: string) => {
    if (linking) return;
    setLinking(true);
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_meeting_note_id: noteId }),
      });
      if (!res.ok) throw new Error("Failed to link meeting note");
      showToast("Linked meeting note");
      setOpen(false);
      router.refresh();
    } catch {
      // keep open on error
    } finally {
      setLinking(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-stone-400 hover:text-navy transition-colors"
      >
        + Link
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-stone-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-stone-500">
          Link a meeting note
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-400 hover:text-navy transition-colors"
        >
          Cancel
        </button>
      </div>
      {loading ? (
        <p className="text-xs text-stone-400">Loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-stone-400">
          No unlinked meeting notes available.
        </p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {notes.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => handleLink(note.id)}
                disabled={linking}
                className="w-full text-left text-sm text-navy hover:bg-stone-50 rounded px-2 py-1 transition-colors disabled:opacity-40"
              >
                {note.title}
                <span className="text-xs text-stone-400 ml-1.5">
                  &mdash;{" "}
                  {new Date(
                    note.date.includes("T") ? note.date : note.date + "T00:00:00"
                  ).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
