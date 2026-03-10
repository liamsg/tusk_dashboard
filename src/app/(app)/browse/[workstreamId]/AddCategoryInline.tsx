"use client";

import { useRouter } from "next/navigation";
import { InlineAddForm } from "@/components/InlineAddForm";

interface AddCategoryInlineProps {
  workstreamId: string;
}

export function AddCategoryInline({ workstreamId }: AddCategoryInlineProps) {
  const router = useRouter();

  const handleSubmit = async (name: string) => {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workstream_id: workstreamId, name }),
    });

    if (!res.ok) throw new Error("Failed to add category");
    router.refresh();
  };

  return (
    <InlineAddForm
      label="Add new category"
      placeholder="Category name"
      onSubmit={handleSubmit}
    />
  );
}
