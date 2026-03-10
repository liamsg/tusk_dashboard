"use client";

import { useState, useRef } from "react";
import { showToast } from "@/components/Toast";

interface InlineAddFormProps {
  label: string;
  placeholder: string;
  onSubmit: (value: string) => Promise<void>;
}

export function InlineAddForm({
  label,
  placeholder,
  onSubmit,
}: InlineAddFormProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setValue("");
      setOpen(false);
      showToast("Created successfully");
    } catch {
      // stay open so user can retry
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
      setValue("");
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs text-stone-400 hover:text-navy transition-colors py-2"
      >
        + {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={submitting}
        className="w-full md:w-64 rounded border border-stone-200 bg-white px-2 py-1 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !value.trim()}
        className="rounded bg-navy px-3 py-2 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
      >
        {submitting ? "..." : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setValue("");
          setOpen(false);
        }}
        className="text-xs text-stone-400 hover:text-navy transition-colors px-3 py-2"
      >
        Cancel
      </button>
    </div>
  );
}
