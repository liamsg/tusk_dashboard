"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

interface AddNoteFormProps {
  entityType: string;
  entityId: string;
}

export function AddNoteForm({ entityType, entityId }: AddNoteFormProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          entity_type: entityType,
          entity_id: entityId,
        }),
      });

      if (!res.ok) throw new Error("Failed to add note");

      setContent("");
      setOpen(false);
      showToast("Note added");
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
      setContent("");
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs text-stone-400 hover:text-navy transition-colors py-2"
      >
        + Add
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a note..."
        rows={3}
        disabled={submitting}
        className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20 resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          className="rounded bg-navy px-3 py-2 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setContent("");
            setOpen(false);
          }}
          className="text-xs text-stone-400 hover:text-navy transition-colors px-3 py-2"
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
