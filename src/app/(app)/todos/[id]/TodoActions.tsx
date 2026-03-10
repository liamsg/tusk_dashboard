"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TodoActionsProps {
  todoId: string;
  currentStatus: string;
  currentBallInCourt: string;
  currentAssignedTo: string;
  users: { id: string; name: string }[];
  title: string;
}

export function TodoActions({
  todoId,
  currentStatus,
  currentBallInCourt,
  currentAssignedTo,
  users,
  title,
}: TodoActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [ballInCourt, setBallInCourt] = useState(currentBallInCourt);
  const [assignedTo, setAssignedTo] = useState(currentAssignedTo);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  const patchTodo = async (fields: Record<string, unknown>) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error("Failed to update todo");
      router.refresh();
    } catch {
      // revert on failure
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleDone = () => {
    const newStatus = status === "done" ? "open" : "done";
    setStatus(newStatus);
    patchTodo({ status: newStatus });
  };

  const handleBallInCourtChange = (value: string) => {
    setBallInCourt(value);
    patchTodo({ ball_in_court: value });
  };

  const handleAssignedToChange = (value: string) => {
    setAssignedTo(value);
    patchTodo({ assigned_to: value });
  };

  const handleArchive = () => {
    patchTodo({ archived: true });
  };

  const isDone = status === "done";

  return (
    <div>
      {/* Title with checkbox */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleToggleDone}
          disabled={updating}
          className="mt-1 flex-shrink-0 focus:outline-none"
          title={isDone ? "Mark as open" : "Mark as done"}
        >
          {isDone ? (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-green-500 bg-green-500 text-white text-xs">
              &#10003;
            </span>
          ) : (
            <span className="inline-block h-5 w-5 rounded border-2 border-stone-300 bg-white hover:border-navy transition-colors" />
          )}
        </button>
        <h1
          className={`font-heading text-xl ${
            isDone ? "text-stone-400 line-through" : "text-navy"
          }`}
        >
          {title}
        </h1>
      </div>

      {/* Action controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {/* Assigned to dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-400">Assigned:</span>
          <select
            value={assignedTo}
            onChange={(e) => handleAssignedToChange(e.target.value)}
            disabled={updating}
            className="rounded border border-stone-200 bg-white px-2 py-1 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy/20 disabled:opacity-50"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ball in court dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-400">Ball in court:</span>
          <select
            value={ballInCourt}
            onChange={(e) => handleBallInCourtChange(e.target.value)}
            disabled={updating}
            className="rounded border border-stone-200 bg-white px-2 py-1 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy/20 disabled:opacity-50"
          >
            <option value="us">Us</option>
            <option value="external">External</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>

        {/* Archive button */}
        <button
          type="button"
          onClick={handleArchive}
          disabled={updating}
          className="ml-auto rounded border border-stone-200 px-2 py-1 text-xs text-stone-400 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50"
        >
          Archive
        </button>
      </div>
    </div>
  );
}
