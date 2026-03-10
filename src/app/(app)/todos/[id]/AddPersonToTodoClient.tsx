"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

interface AddPersonToTodoClientProps {
  todoId: string;
  allPeople: {
    id: string;
    name: string;
    email: string | null;
    organisation_name: string | null;
  }[];
}

export function AddPersonToTodoClient({
  todoId,
  allPeople,
}: AddPersonToTodoClientProps) {
  const [open, setOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState(
    allPeople[0]?.id ?? ""
  );
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!selectedPersonId || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_person_id: selectedPersonId }),
      });

      if (!res.ok) throw new Error("Failed to link person");

      showToast("Linked person");
      setOpen(false);
      setSelectedPersonId(allPeople[0]?.id ?? "");
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
    <div className="mt-2 space-y-2 rounded-lg border border-stone-200 bg-white p-3">
      <div>
        <label className="block text-xs text-stone-400 mb-1">
          Select person
        </label>
        <select
          value={selectedPersonId}
          onChange={(e) => setSelectedPersonId(e.target.value)}
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        >
          {allPeople.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.organisation_name ? ` (${p.organisation_name})` : ""}
              {p.email ? ` - ${p.email}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !selectedPersonId}
          className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {submitting ? "Linking..." : "Link Person"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-400 hover:text-navy transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
