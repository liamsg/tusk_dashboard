"use client";

import { useRouter } from "next/navigation";
import { InlineAddForm } from "@/components/InlineAddForm";

interface AddCategoryFormProps {
  workstreamId: string;
}

export function AddCategoryForm({ workstreamId }: AddCategoryFormProps) {
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
      label="Category"
      placeholder="Category name"
      onSubmit={handleSubmit}
    />
  );
}
