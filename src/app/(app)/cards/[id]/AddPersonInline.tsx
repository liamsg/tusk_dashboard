"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

interface AddPersonInlineProps {
  cardId: string;
}

export function AddPersonInline({ cardId }: AddPersonInlineProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const resetForm = () => {
    setName("");
    setRole("");
    setEmail("");
    setOpen(false);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;

    setSubmitting(true);
    try {
      // Create the person
      const createRes = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          role: role.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });

      if (!createRes.ok) throw new Error("Failed to create person");

      const person = await createRes.json();

      // Link person to card
      await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_person_id: person.id }),
      });

      showToast("Person added");
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
        <label className="block text-xs text-stone-400 mb-1">Name *</label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Full name"
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>
      <div>
        <label className="block text-xs text-stone-400 mb-1">Role</label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Managing Director"
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>
      <div>
        <label className="block text-xs text-stone-400 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="email@example.com"
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !name.trim()}
          className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {submitting ? "Adding..." : "Add Person"}
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
