"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

interface EditNoteContentProps {
  meetingNoteId: string;
  content: string | null;
}

export function EditNoteContent({ meetingNoteId, content }: EditNoteContentProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(content || "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/meeting-notes/${meetingNoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
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

  if (editing) {
    return (
      <div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full min-h-[200px] rounded border border-stone-200 bg-white px-3 py-2 text-base text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20 resize-y whitespace-pre-wrap leading-relaxed"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-navy px-3 py-2 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(content || "");
              setEditing(false);
            }}
            className="text-xs text-stone-400 hover:text-navy transition-colors px-3 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-stone-400">
          Content
        </h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-stone-300 hover:text-navy transition-colors p-2"
          aria-label="Edit content"
          title="Edit content"
        >
          <span className="text-sm">&#9998;</span>
        </button>
      </div>
      {content ? (
        <p className="text-base text-navy whitespace-pre-wrap leading-relaxed">
          {content}
        </p>
      ) : (
        <p className="text-sm text-stone-400">No content recorded.</p>
      )}
    </div>
  );
}
