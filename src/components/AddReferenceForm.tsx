"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REF_TYPES = [
  { value: "email", label: "Email" },
  { value: "document", label: "Document" },
  { value: "folder", label: "Folder" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "link", label: "Link" },
  { value: "other", label: "Other" },
] as const;

interface AddReferenceFormProps {
  entityType: string;
  entityId: string;
}

export function AddReferenceForm({
  entityType,
  entityId,
}: AddReferenceFormProps) {
  const [open, setOpen] = useState(false);
  const [refType, setRefType] = useState("email");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const resetForm = () => {
    setRefType("email");
    setTitle("");
    setDate("");
    setDetail("");
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !detail.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref_type: refType,
          title: title.trim(),
          date: date || undefined,
          detail: detail.trim(),
          entity_type: entityType,
          entity_id: entityId,
        }),
      });

      if (!res.ok) throw new Error("Failed to add reference");

      // Also link to the card via card_refs
      const ref = await res.json();
      if (entityType === "card") {
        await fetch(`/api/cards/${entityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ link_ref_id: ref.id }),
        });
      }

      resetForm();
      router.refresh();
    } catch {
      // keep form open
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-stone-400 hover:text-navy transition-colors"
      >
        + Add
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-stone-200 bg-white p-3">
      <div>
        <label className="block text-xs text-stone-400 mb-1">Type</label>
        <select
          value={refType}
          onChange={(e) => setRefType(e.target.value)}
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        >
          {REF_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-stone-400 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Fee proposal email"
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>

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
        <label className="block text-xs text-stone-400 mb-1">Detail</label>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Additional details..."
          rows={2}
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !detail.trim()}
          className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {submitting ? "Saving..." : "Save Reference"}
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="text-xs text-stone-400 hover:text-navy transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
