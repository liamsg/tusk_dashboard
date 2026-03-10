"use client";

import { EditableTitle } from "@/components/EditableTitle";

interface EditableCategoryNameProps {
  categoryId: string;
  name: string;
}

export function EditableCategoryName({ categoryId, name }: EditableCategoryNameProps) {
  const handleSave = async (newName: string) => {
    const res = await fetch(`/api/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) throw new Error("Failed to rename category");
  };

  return (
    <EditableTitle
      value={name}
      onSave={handleSave}
      className="text-sm font-medium text-navy"
    />
  );
}
