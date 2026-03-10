"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface ViewToggleProps {
  currentView: "briefing" | "cards";
  workstreamId: string;
}

export function ViewToggle({ currentView, workstreamId }: ViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchView(view: "briefing" | "cards") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`/browse/${workstreamId}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => switchView("briefing")}
        className={
          currentView === "briefing"
            ? "bg-navy text-white rounded px-3 py-1 text-sm"
            : "text-stone-500 hover:text-navy px-3 py-1 text-sm transition-colors"
        }
      >
        Briefing
      </button>
      <button
        onClick={() => switchView("cards")}
        className={
          currentView === "cards"
            ? "bg-navy text-white rounded px-3 py-1 text-sm"
            : "text-stone-500 hover:text-navy px-3 py-1 text-sm transition-colors"
        }
      >
        Cards
      </button>
    </div>
  );
}
