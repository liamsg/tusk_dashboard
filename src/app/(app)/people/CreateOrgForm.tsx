"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

export function CreateOrgForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [website, setWebsite] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const resetForm = () => {
    setName("");
    setOrgType("");
    setWebsite("");
    setSummary("");
    setOpen(false);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/organisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          org_type: orgType.trim() || undefined,
          website: website.trim() || undefined,
          summary: summary.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to create organisation");

      showToast("Organisation created");
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
        className="rounded border border-stone-200 px-3 py-1.5 text-xs text-stone-500 hover:text-navy hover:border-navy transition-colors"
      >
        + Organisation
      </button>
    );
  }

  return (
    <div className="w-full mt-4 space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-400 mb-1">Name *</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Organisation name"
            className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </div>

        <div>
          <label className="block text-xs text-stone-400 mb-1">Type</label>
          <input
            type="text"
            value={orgType}
            onChange={(e) => setOrgType(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Corporate Finance"
            className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-stone-400 mb-1">Website</label>
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>

      <div>
        <label className="block text-xs text-stone-400 mb-1">Summary</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Brief description..."
          rows={2}
          className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20 resize-none"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !name.trim()}
          className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {submitting ? "Creating..." : "Create Organisation"}
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
