"use client";

import { EditableTitle } from "@/components/EditableTitle";
import { showToast } from "@/components/Toast";

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
    showToast("Subcategory renamed");
  };

  return (
    <EditableTitle
      value={name}
      onSave={handleSave}
      className="text-sm font-medium text-navy"
    />
  );
}
