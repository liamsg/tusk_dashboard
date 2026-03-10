"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface AddTodoInlineProps {
  cardId: string;
  users: { id: string; name: string }[];
}

export function AddTodoInline({ cardId, users }: AddTodoInlineProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState(users[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const resetForm = () => {
    setTitle("");
    setAssignedTo(users[0]?.id ?? "");
    setDueDate("");
    setOpen(false);
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !assignedTo || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          assigned_to: assignedTo,
          due_date: dueDate || undefined,
          card_id: cardId,
        }),
      });

      if (!res.ok) throw new Error("Failed to add todo");

      resetForm();
      router.refresh();
    } catch {
      // keep form open
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
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
        className="text-xs text-stone-400 hover:text-navy transition-colors"
      >
        + Add
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-stone-200 bg-white p-3">
      <div>
        <label className="block text-xs text-stone-400 mb-1">Title *</label>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done?"
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-stone-400 mb-1">Assign to *</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-stone-400 mb-1">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !assignedTo}
          className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {submitting ? "Adding..." : "Add To-Do"}
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
