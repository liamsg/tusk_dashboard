"use client";

import { useState, useEffect, useCallback } from "react";

// ── Public API ──────────────────────────────────────────────────────────────
export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent("tusk-toast", { detail: message }));
}

// ── Component ───────────────────────────────────────────────────────────────
export function Toast() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const handleToast = useCallback((e: Event) => {
    const msg = (e as CustomEvent<string>).detail;
    setMessage(msg);
    setVisible(true);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => setMessage(null), 300); // wait for fade-out
    }, 3000);
  }, []);

  useEffect(() => {
    window.addEventListener("tusk-toast", handleToast);
    return () => window.removeEventListener("tusk-toast", handleToast);
  }, [handleToast]);

  if (!message) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] rounded-lg bg-navy px-4 py-2 text-sm text-white shadow-lg transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {message}
    </div>
  );
}
