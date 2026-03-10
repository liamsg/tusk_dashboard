"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UserOption {
  id: string;
  name: string;
}

interface CreateTodoFromNoteProps {
  meetingNoteId: string;
  users: UserOption[];
}

export function CreateTodoFromNote({ meetingNoteId, users }: CreateTodoFromNoteProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState(users[0]?.id || "");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  const resetForm = () => {
    setTitle("");
    setAssignedTo(users[0]?.id || "");
    setDueDate("");
    setOpen(false);
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !assignedTo || submitting) return;

    setSubmitting(true);
    try {
      // 1. Create the todo
      const todoRes = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          assigned_to: assignedTo,
          due_date: dueDate || undefined,
        }),
      });

      if (!todoRes.ok) throw new Error("Failed to create todo");
      const todo = await todoRes.json();

      // 2. Link it to the meeting note
      const linkRes = await fetch(`/api/meeting-notes/${meetingNoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_todo_id: todo.id }),
      });

      if (!linkRes.ok) throw new Error("Failed to link todo");

      resetForm();
      setToast("To-do created and linked");
      setTimeout(() => setToast(null), 3000);
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

  return (
    <div>
      {toast && (
        <div className="mb-2 text-xs text-green-600 bg-green-50 rounded px-3 py-1.5">
          {toast}
        </div>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-stone-400 hover:text-navy transition-colors"
        >
          + Create to-do
        </button>
      ) : (
        <div className="mt-2 space-y-2 rounded-lg border border-stone-200 bg-white p-3">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="e.g. Follow up on contract"
              className="w-full rounded border border-stone-200 bg-white px-3 py-1.5 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Assigned to *</label>
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
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !assignedTo}
              className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
            >
              {submitting ? "Creating..." : "Create & Link"}
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
      )}
    </div>
  );
}
