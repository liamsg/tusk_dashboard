"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

interface EditNoteTitleProps {
  meetingNoteId: string;
  title: string;
}

export function EditNoteTitle({ meetingNoteId, title }: EditNoteTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/meeting-notes/${meetingNoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to save");
      showToast("Meeting note updated");
      setEditing(false);
      router.refresh();
    } catch {
      // keep editing open
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setValue(title);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 font-heading text-xl text-navy rounded border border-stone-200 bg-white px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="rounded bg-navy px-2 py-1 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {saving ? "..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(title);
            setEditing(false);
          }}
          className="text-xs text-stone-400 hover:text-navy transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <h1
      className="mt-1 font-heading text-xl text-navy cursor-pointer hover:text-navy-light transition-colors"
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {title}
    </h1>
  );
}
