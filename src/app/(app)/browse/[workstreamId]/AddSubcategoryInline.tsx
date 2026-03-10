"use client";

import { useRouter } from "next/navigation";
import { InlineAddForm } from "@/components/InlineAddForm";

interface AddSubcategoryInlineProps {
  categoryId: string;
}

export function AddSubcategoryInline({ categoryId }: AddSubcategoryInlineProps) {
  const router = useRouter();

  const handleSubmit = async (name: string) => {
    const res = await fetch("/api/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_id: categoryId, name }),
    });

    if (!res.ok) throw new Error("Failed to add subcategory");
    router.refresh();
  };

  return (
    <InlineAddForm
      label="Subcategory"
      placeholder="Subcategory name"
      onSubmit={handleSubmit}
    />
  );
}
