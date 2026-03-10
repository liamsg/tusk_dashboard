"use client";

import { EditableTitle } from "@/components/EditableTitle";

interface EditableSubcategoryNameProps {
  subcategoryId: string;
  name: string;
}

export function EditableSubcategoryName({ subcategoryId, name }: EditableSubcategoryNameProps) {
  const handleSave = async (newName: string) => {
    const res = await fetch(`/api/subcategories/${subcategoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) throw new Error("Failed to rename subcategory");
  };

  return (
    <EditableTitle
      value={name}
      onSave={handleSave}
      className="text-sm font-medium text-navy"
    />
  );
}
