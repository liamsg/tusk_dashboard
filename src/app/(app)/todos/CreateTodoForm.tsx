"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

interface CreateTodoFormProps {
  users: { id: string; name: string }[];
  currentUserId?: string;
}

export function CreateTodoForm({ users, currentUserId }: CreateTodoFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState(currentUserId ?? users[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [ballInCourt, setBallInCourt] = useState("us");
  const [cardId, setCardId] = useState("");
  const [cards, setCards] = useState<{ id: string; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Fetch available cards when form opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/cards")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCards(Array.isArray(data) ? data : []))
      .catch(() => setCards([]));
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedTo(currentUserId ?? users[0]?.id ?? "");
    setDueDate("");
    setBallInCourt("us");
    setCardId("");
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
          description: description.trim() || undefined,
          assigned_to: assignedTo,
          due_date: dueDate || undefined,
          ball_in_court: ballInCourt,
          card_id: cardId || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to create todo");

      showToast("To-do created");
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
          placeholder="What needs to be done?"
          className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>

      <div>
        <label className="block text-xs text-stone-400 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Additional details..."
          rows={2}
          className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20 resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-stone-400 mb-1">
            Assign to *
          </label>
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

        <div>
          <label className="block text-xs text-stone-400 mb-1">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </div>

        <div>
          <label className="block text-xs text-stone-400 mb-1">
            Ball in court
          </label>
          <select
            value={ballInCourt}
            onChange={(e) => setBallInCourt(e.target.value)}
            className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          >
            <option value="us">Us</option>
            <option value="external">External</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      </div>

      {cards.length > 0 && (
        <div>
          <label className="block text-xs text-stone-400 mb-1">
            Link to card
          </label>
          <select
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          >
            <option value="">None</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !assignedTo}
          className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {submitting ? "Creating..." : "Create To-Do"}
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
