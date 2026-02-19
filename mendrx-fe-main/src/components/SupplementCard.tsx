// File: src/components/SupplementCard.tsx
import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, Trash2, Save, X } from "lucide-react";
import toast from "react-hot-toast";

type SupplementField = keyof Omit<Supplement, "id" | "timingCategory">;

const TIMING_CATEGORIES = [
  "morning",
  "afternoon",
  "night",
  "Not Specified",
] as const;
type TimingCategory = (typeof TIMING_CATEGORIES)[number];

interface Supplement {
  id: string;
  name: string;
  purpose: string;
  timing: string;
  dosage: string;
  precautions: string;
  timingCategory: TimingCategory;
  brandSuggestionsAndGuidelines: string;
}

interface SupplementCardProps {
  supplement: Supplement;
  index: number;
  isEditing: boolean;
  onUpdate: (index: number, updatedSupplement: Supplement) => Promise<void> | void;
  onEditToggle: () => void;
  onDeleteClick: () => void;
  allSupplements: Supplement[];
}

const SupplementCard: React.FC<SupplementCardProps> = ({
  supplement,
  index,
  isEditing,
  onUpdate,
  onEditToggle,
  onDeleteClick,
  allSupplements,
}) => {
  // Add local state for editing fields
  const [editValues, setEditValues] = React.useState(supplement);
  const [nameError, setNameError] = React.useState("");
  const [isSaving, setIsSaving] = useState(false);

  // When entering edit mode, initialize local state from prop
  // Also sync when supplement prop changes (after save)
  React.useEffect(() => {
    if (isEditing) {
      setEditValues(supplement);
      setNameError("");
    }
  }, [isEditing, supplement]);

  // Keep local state in sync with prop changes only when not editing
  React.useEffect(() => {
    if (!isEditing) {
      setEditValues(supplement);
    }
  }, [supplement, isEditing]);

  const handleFieldChange = (
    field: SupplementField | "timingCategory",
    value: string
  ) => {
    if (field === "name") {
      if (!value.trim()) {
        setNameError("Name is required");
      } else {
        const isDuplicate = allSupplements.some(
          (s) =>
            s.id !== supplement.id &&
            s.name.toLowerCase() === value.trim().toLowerCase()
        );
        if (isDuplicate) {
          setNameError("A supplement with this name already exists");
        } else {
          setNameError("");
        }
      }
    }
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const fields: Array<{ name: SupplementField; label: string }> = [
    { name: "name", label: "Name" },
    { name: "purpose", label: "Purpose" },
    { name: "timing", label: "Timing" },
    { name: "dosage", label: "Dosage" },
    { name: "precautions", label: "Precautions" },
    {
      name: "brandSuggestionsAndGuidelines",
      label: "Brand Suggestions & Guidelines",
    },
  ];

  const handleCancelEdit = () => {
    setEditValues(supplement); // Reset local state
    setNameError("");
    onEditToggle();
  };

  const handleSaveEdit = async () => {
    if (!!nameError || !editValues.name.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(index, editValues);
      onEditToggle();
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mb-6 p-6 border rounded-lg bg-card">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-12">
          <h3 className="font-bold text-xl">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editValues.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  className={nameError ? "border-red-500" : ""}
                />
                {nameError && (
                  <p className="text-sm text-red-500">{nameError}</p>
                )}
              </div>
            ) : (
              supplement.name
            )}
          </h3>
          <select
            value={
              isEditing
                ? editValues.timingCategory || "Not Specified"
                : supplement.timingCategory || "Not Specified"
            }
            onChange={(e) =>
              handleFieldChange("timingCategory", e.target.value)
            }
            className="h-10 px-4 py-2 border rounded-md text-base font-medium bg-background"
            disabled={!isEditing}
          >
            {TIMING_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                className="h-8"
                disabled={!!nameError || !editValues.name.trim() || isSaving}
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onEditToggle}
                className="h-8"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteClick}
                className="h-8 text-destructive hover:text-destructive hover:border-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {fields.slice(1).map((field) => (
          <div key={field.name} className="space-y-2">
            <Label className="text-sm font-medium">{field.label}</Label>
            {isEditing ? (
              <Textarea
                value={editValues[field.name]}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {supplement[field.name] || "Not specified"}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupplementCard;
