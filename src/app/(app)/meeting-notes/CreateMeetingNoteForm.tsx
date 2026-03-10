"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface PersonOption {
  id: string;
  name: string;
  organisation_name: string | null;
}

interface CreateMeetingNoteFormProps {
  people: PersonOption[];
}

export function CreateMeetingNoteForm({ people }: CreateMeetingNoteFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(
    new Set()
  );
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const resetForm = () => {
    setTitle("");
    setDate(new Date().toISOString().split("T")[0]);
    setContent("");
    setTags("");
    setSelectedAttendees(new Set());
    setOpen(false);
  };

  const toggleAttendee = (id: string) => {
    setSelectedAttendees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/meeting-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          date: date || undefined,
          content: trimmedContent,
          tags: tags.trim() || undefined,
          attendee_ids: Array.from(selectedAttendees),
        }),
      });

      if (!res.ok) throw new Error("Failed to create meeting note");

      resetForm();
      router.refresh();
    } catch {
      // keep form open
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      resetForm();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light transition-colors"
      >
        + New
      </button>
    );
  }

  return (
    <div className="w-full mt-4 space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      <div>
        <label className="block text-xs text-stone-400 mb-1">Title *</label>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Call with PwC re: tax structuring"
          className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </div>

        <div>
          <label className="block text-xs text-stone-400 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. tax, pwc, structure"
            className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-stone-400 mb-1">Content *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Brain dump everything from the meeting..."
          rows={8}
          className="w-full min-h-[200px] rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20 resize-y"
        />
      </div>

      {/* Attendee selection */}
      {people.length > 0 && (
        <div>
          <label className="block text-xs text-stone-400 mb-2">
            Attendees
          </label>
          <div className="max-h-40 overflow-y-auto rounded border border-stone-200 bg-white p-2 space-y-1">
            {people.map((person) => (
              <label
                key={person.id}
                className="flex items-center gap-2 text-sm text-navy cursor-pointer hover:bg-stone-50 px-1 py-0.5 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedAttendees.has(person.id)}
                  onChange={() => toggleAttendee(person.id)}
                  className="rounded border-stone-300"
                />
                <span>{person.name}</span>
                {person.organisation_name && (
                  <span className="text-stone-400 text-xs">
                    ({person.organisation_name})
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !content.trim()}
          className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {submitting ? "Creating..." : "Create Note"}
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="text-xs text-stone-400 hover:text-navy transition-colors"
        >
          Cancel
        </button>
        <span className="text-xs text-stone-300 ml-auto">
          Cmd+Enter to save
        </span>
      </div>
    </div>
  );
}
