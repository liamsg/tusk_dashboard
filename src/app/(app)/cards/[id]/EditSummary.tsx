"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface EditSummaryProps {
  cardId: string;
  initialSummary: string | null;
}

export function EditSummary({ cardId, initialSummary }: EditSummaryProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialSummary ?? "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const handleOpen = () => {
    setText(initialSummary ?? "");
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: text.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to update summary");
      setEditing(false);
      router.refresh();
    } catch {
      // keep form open on error
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="w-full text-left text-base text-stone-700 leading-relaxed hover:bg-stone-50 rounded px-1 -mx-1 py-0.5 transition-colors"
      >
        {initialSummary || "No summary yet. Click to add."}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={4}
        className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-base text-stone-700 leading-relaxed placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        placeholder="Enter a summary..."
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-stone-400 hover:text-navy transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
