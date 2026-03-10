"use client";

import { useRouter } from "next/navigation";
import { InlineAddForm } from "@/components/InlineAddForm";

interface AddCardInlineProps {
  categoryId: string;
  subcategoryId: string | null;
}

export function AddCardInline({ categoryId, subcategoryId }: AddCardInlineProps) {
  const router = useRouter();

  const handleSubmit = async (title: string) => {
    const body: Record<string, string> = { title, category_id: categoryId };
    if (subcategoryId) {
      body.subcategory_id = subcategoryId;
    }

    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to add card");
    router.refresh();
  };

  return (
    <InlineAddForm
      label="Card"
      placeholder="Card title"
      onSubmit={handleSubmit}
    />
  );
}
