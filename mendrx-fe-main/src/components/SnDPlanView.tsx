// File: src/components/SnDPlanView.tsx
import React, { useState, useEffect, lazy, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Plus,
  Save,
  Edit2,
  Trash2,
  X,
  Download,
  ChevronDown,
  FileText,
  Wand2,
  Settings,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { createAuthClient } from "@/lib/supabase-auth";
import { ClientInfo } from "@/types/client-info";
import { generateSNDPDF } from "@/utils/sndPdfGenerator";
import { generateSNDExcel } from "@/utils/sndExcelGenerator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatGender, formatDiet, formatEnumValue } from "@/utils/formatters";
import SupplementCard from "./SupplementCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TIMING_CATEGORIES = [
  "morning",
  "afternoon",
  "night",
  "Not Specified",
] as const;
type TimingCategory = (typeof TIMING_CATEGORIES)[number];

// Load DietInstructionsDialog component lazily
const DietInstructionsDialog = lazy(() => import("./DietInstructionsDialog"));

interface NewSupplementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
}

const NewSupplementModal: React.FC<NewSupplementModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [supplementName, setSupplementName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplementName.trim()) {
      setError("Supplement name is required");
      return;
    }

    onAdd(supplementName.trim());
    setSupplementName("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Supplement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Supplement Name</Label>
              <Input
                id="name"
                placeholder="Enter supplement name"
                value={supplementName}
                onChange={(e) => {
                  setSupplementName(e.target.value);
                  setError("");
                }}
                className={error ? "border-red-500" : ""}
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Supplement</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface NewDietPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (day: string) => void;
  existingDays: string[];
}

const NewDietPlanModal: React.FC<NewDietPlanModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingDays,
}) => {
  const [dayLabel, setDayLabel] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!dayLabel.trim()) {
      setError("Please enter a day label");
      return;
    }

    if (existingDays.includes(dayLabel.trim())) {
      setError("This day label already exists in the plan");
      return;
    }

    onAdd(dayLabel.trim());
    setDayLabel("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Diet Plan Day</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="day">Day Label</Label>
              <Input
                id="day"
                type="text"
                placeholder="Enter day label (e.g., Day 1, Week 1)"
                value={dayLabel}
                onChange={(e) => {
                  setDayLabel(e.target.value);
                  setError("");
                }}
                className={error ? "border-red-500" : ""}
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: "supplement" | "diet day";
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete {itemType}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>
            Are you sure you want to delete {itemType} "{itemName}"?
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const getApiUrl = () => {
  switch (process.env.NEXT_PUBLIC_ENV) {
    case "production":
      return process.env.NEXT_PUBLIC_PROD_API_URL;
    case "development":
      return process.env.NEXT_PUBLIC_DEV_API_URL;
    default:
      return process.env.NEXT_PUBLIC_LOCAL_API_URL;
  }
};

interface SnDPlanViewProps {
  reportId: string;
  clientInfo: ClientInfo;
  supplementsEnabled: boolean;
  dietPlanEnabled: boolean;
  dietVersioningEnabled: boolean;
  supplementsAutoPopulationEnabled: boolean;
}

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

interface BrandSuggestion {
  supplementName: string;
  brandName: string;
  productLink: string;
  guidelines: string;
}

interface DayPlan {
  id: string;
  day: string;
  label?: string;
  preMorning: string;
  morning: string;
  midMorning: string;
  lunch: string;
  earlyEvening: string;
  night: string;
  bedtime: string;
}

interface DietPlan {
  id: string;
  versionNumber: number;
  createdAt: string;
  dietNotes?: string;
  dayPlans: DayPlan[];
}

interface SnDPlan {
  supplements: Supplement[];
  supplementNotes?: string;
  dietPlanVersions: DietPlan[];
  versionCount: number;
}

interface EditState {
  fieldName: string;
  supplementIndex?: number;
  isDietEditing?: boolean;
}

interface SupplementBrandGuideline {
  id: string;
  supplementName: string;
  brandName: string;
  productLink: string;
  guidelines: string;
  createdAt: string;
  updatedAt: string;
}

interface ManageSupplementsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  authClient: any;
}

const ManageSupplementsDialog: React.FC<ManageSupplementsDialogProps> = ({
  isOpen,
  onClose,
  authClient,
}) => {
  const [supplements, setSupplements] = useState<SupplementBrandGuideline[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSupplement, setEditingSupplement] =
    useState<SupplementBrandGuideline | null>(null);
  const [formData, setFormData] = useState({
    supplementName: "",
    brandName: "",
    productLink: "",
    guidelines: "",
  });

  const fetchSupplements = async () => {
    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) return;

      const apiUrl = getApiUrl();
      if (!apiUrl) {
        toast.error("API URL not configured");
        return;
      }

      const response = await fetch(`${apiUrl}/supplements/manage`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to fetch supplements");
      }

      setSupplements(result.data);
    } catch (error) {
      console.error("Error fetching supplements:", error);
      toast.error("Failed to fetch supplements. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSupplements();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) return;

      const apiUrl = getApiUrl();
      if (!apiUrl) {
        toast.error("API URL not configured");
        return;
      }

      const url = editingSupplement
        ? `${apiUrl}/supplements/manage/${editingSupplement.id}`
        : `${apiUrl}/supplements/manage`;

      const response = await fetch(url, {
        method: editingSupplement ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to save supplement");
      }

      toast.success(
        `Supplement ${editingSupplement ? "updated" : "created"} successfully`
      );
      setEditingSupplement(null);
      setFormData({
        supplementName: "",
        brandName: "",
        productLink: "",
        guidelines: "",
      });
      fetchSupplements();
    } catch (error) {
      console.error("Error saving supplement:", error);
      toast.error("Failed to save supplement. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplement?")) return;

    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) return;

      const apiUrl = getApiUrl();
      if (!apiUrl) {
        toast.error("API URL not configured");
        return;
      }

      const response = await fetch(`${apiUrl}/supplements/manage/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to delete supplement");
      }

      toast.success("Supplement deleted successfully");
      fetchSupplements();
    } catch (error) {
      console.error("Error deleting supplement:", error);
      toast.error("Failed to delete supplement. Please try again.");
    }
  };

  const handleEdit = (supplement: SupplementBrandGuideline) => {
    setEditingSupplement(supplement);
    setFormData({
      supplementName: supplement.supplementName,
      brandName: supplement.brandName,
      productLink: supplement.productLink,
      guidelines: supplement.guidelines,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Supplement Brand Guidelines</DialogTitle>
          <DialogDescription>
            Create, update, or delete supplement brand guidelines for
            auto-population.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplementName">Supplement Name</Label>
              <Input
                id="supplementName"
                value={formData.supplementName}
                onChange={(e) =>
                  setFormData({ ...formData, supplementName: e.target.value })
                }
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={formData.brandName}
                onChange={(e) =>
                  setFormData({ ...formData, brandName: e.target.value })
                }
                required
                maxLength={255}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="productLink">Product Link</Label>
            <Input
              id="productLink"
              value={formData.productLink}
              onChange={(e) =>
                setFormData({ ...formData, productLink: e.target.value })
              }
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guidelines">Guidelines</Label>
            <Textarea
              id="guidelines"
              value={formData.guidelines}
              onChange={(e) =>
                setFormData({ ...formData, guidelines: e.target.value })
              }
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            {editingSupplement && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingSupplement(null);
                  setFormData({
                    supplementName: "",
                    brandName: "",
                    productLink: "",
                    guidelines: "",
                  });
                }}
              >
                Cancel Edit
              </Button>
            )}
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : editingSupplement
                ? "Update Brand Guidelines"
                : "Create Brand Guidelines"}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Existing Guidelines</h3>
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplement Name</TableHead>
                  <TableHead>Brand Name</TableHead>
                  <TableHead>Product Link</TableHead>
                  <TableHead>Guidelines</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplements.map((supplement) => (
                  <TableRow key={supplement.id}>
                    <TableCell>{supplement.supplementName}</TableCell>
                    <TableCell>{supplement.brandName}</TableCell>
                    <TableCell>
                      <a
                        href={supplement.productLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {supplement.productLink}
                      </a>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {supplement.guidelines}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(supplement)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(supplement.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EditableField: React.FC<{
  label: string;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  handleSave: () => Promise<void>;
}> = ({
  label,
  value,
  isEditing,
  onEdit,
  onChange,
  onSave,
  onCancel,
  handleSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-6">
        <Label className="text-xl font-bold">{label}</Label>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await handleSave();
                    onSave();
                  } catch (error) {
                    console.error("Failed to save:", error);
                    toast.error("Failed to save. Please try again.");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="h-8"
                disabled={isSaving}
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
                onClick={onEdit}
                className="h-8"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1"
        />
      ) : (
        <p className="text-sm text-muted-foreground mt-1">
          {value || "Not specified"}
        </p>
      )}
    </div>
  );
};

const DayPlanCard: React.FC<{
  dayPlan: DayPlan;
  index: number;
  isEditing: boolean;
  onUpdate: (index: number, field: string, value: string) => void;
  onEditToggle: () => void;
  onDeleteClick: () => void;
  handleSave: () => Promise<void>;
}> = ({
  dayPlan,
  index,
  isEditing,
  onUpdate,
  onEditToggle,
  onDeleteClick,
  handleSave,
}) => {
  const mealTimes = [
    { name: "preMorning", label: "Pre-Morning" },
    { name: "morning", label: "Morning" },
    { name: "midMorning", label: "Mid-Morning" },
    { name: "lunch", label: "Lunch" },
    { name: "earlyEvening", label: "Early Evening" },
    { name: "night", label: "Night" },
    { name: "bedtime", label: "Bedtime" },
  ];
  const [dayLabel, setDayLabel] = useState(dayPlan.day);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setDayLabel(dayPlan.day);
    }
  }, [isEditing, dayPlan.day]);

  const handleDayLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setDayLabel(newLabel);
    onUpdate(index, "day", newLabel);
  };

  return (
    <div className="mb-6 p-6 border rounded-lg bg-card">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex flex-col">
              <Input
                type="text"
                value={dayLabel}
                onChange={handleDayLabelChange}
                className="w-40 h-8 text-xl font-bold"
                placeholder="Enter day label"
              />
            </div>
          ) : (
            <h3 className="font-bold text-xl">{dayPlan.day}</h3>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onEditToggle}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await handleSave();
                    onEditToggle();
                  } catch (error) {
                    console.error("Failed to save:", error);
                    toast.error("Failed to save. Please try again.");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="h-8"
                disabled={isSaving}
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
        {mealTimes.map((mealTime) => (
          <div key={mealTime.name} className="space-y-2">
            <Label className="text-sm font-medium">{mealTime.label}</Label>
            {isEditing ? (
              <Textarea
                value={dayPlan[mealTime.name as keyof DayPlan] as string}
                onChange={(e) => onUpdate(index, mealTime.name, e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {dayPlan[mealTime.name as keyof DayPlan] || "Not specified"}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SnDPlanView({
  reportId,
  clientInfo,
  supplementsEnabled,
  dietPlanEnabled,
  supplementsAutoPopulationEnabled,
}: SnDPlanViewProps) {
  const [plan, setPlan] = useState<SnDPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDietPlanId, setSelectedDietPlanId] = useState<string | null>(
    null
  );
  const [isGeneratingNewPlan, setIsGeneratingNewPlan] = useState(false);
  const [isShowingDietDialog, setIsShowingDietDialog] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const authClient = createAuthClient();
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [isSupplementsPdfLoading, setIsSupplementsPdfLoading] = useState(false);
  const [isDietPlanPdfLoading, setIsDietPlanPdfLoading] = useState(false);
  const [isAddSupplementModalOpen, setIsAddSupplementModalOpen] =
    useState(false);
  const [isAddDietPlanModalOpen, setIsAddDietPlanModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    itemType: "supplement" | "diet day";
    itemName: string;
    index: number;
  } | null>(null);
  const [editingSupplementId, setEditingSupplementId] = useState<string | null>(
    null
  );
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [generateNewPlanProgress, setGenerateNewPlanProgress] = useState(0);
  const progressStartTimeRef = useRef<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [autoPopulateProgress, setAutoPopulateProgress] = useState(0);
  const autoPopulateStartTimeRef = useRef<number | null>(null);

  // Get the current active diet plan
  const getCurrentDietPlan = (): DietPlan | null => {
    if (!plan || !plan.dietPlanVersions || plan.dietPlanVersions.length === 0)
      return null;

    if (selectedDietPlanId) {
      const selected = plan.dietPlanVersions.find(
        (dp: DietPlan) => dp.id === selectedDietPlanId
      );
      if (selected) return selected;
    }

    // If no selection or selection is invalid, return the latest version (highest version number)
    return [...plan.dietPlanVersions].sort(
      (a: DietPlan, b: DietPlan) => b.versionNumber - a.versionNumber
    )[0];
  };

  const fetchPlan = async () => {
    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      const apiUrl = getApiUrl();
      if (!apiUrl) {
        toast.error("API URL not configured");
        return;
      }

      const response = await fetch(`${apiUrl}/snd-plan/${reportId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch plan");
      }

      if (result.success && result.data) {
        // Process the plan data
        const planData = result.data;

        // If no diet plan is currently selected, select the latest version by default
        if (
          (!selectedDietPlanId ||
            !planData.dietPlanVersions.some(
              (v: DietPlan) => v.id === selectedDietPlanId
            )) &&
          planData.dietPlanVersions &&
          planData.dietPlanVersions.length > 0
        ) {
          const latestVersion = [...planData.dietPlanVersions].sort(
            (a: DietPlan, b: DietPlan) => b.versionNumber - a.versionNumber
          )[0];
          setSelectedDietPlanId(latestVersion.id);
        }

        console.log("Fetched plan data:", planData);
        setPlan(planData);
        return planData; // Return the fetched data
      }

      return null;
    } catch (error) {
      console.error("Error fetching plan:", error);
      toast.error("Failed to load plan. Please try again.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle the "loading" progress bar for new plan generation
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isGeneratingNewPlan) {
      setGenerateNewPlanProgress(0);
      progressStartTimeRef.current = Date.now();
      intervalId = setInterval(() => {
        setGenerateNewPlanProgress((prev) => {
          const elapsedTime = Date.now() - (progressStartTimeRef.current || 0);

          // If we've reached max progress and 5 seconds have passed
          if (prev >= 98 && elapsedTime > 5000) {
            // Reset progress and start time for retry
            progressStartTimeRef.current = Date.now();
            setRetryCount((count) => count + 1);
            return 0;
          }

          if (prev >= 98) {
            return 98;
          }
          return prev + 0.3;
        });
      }, 300);
    } else {
      setGenerateNewPlanProgress(0);
      setRetryCount(0);
      progressStartTimeRef.current = null;
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isGeneratingNewPlan]);

  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout;

    debounceTimeout = setTimeout(() => {
      fetchPlan();
    }, 300);

    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [reportId, authClient.auth]);

  const handleCancel = () => {
    setEditState(null);
    fetchPlan();
  };

  const addSupplement = async (name: string) => {
    if (!plan) return;
    const newPlan: SnDPlan = {
      ...plan,
      supplements: [
        {
          id: crypto.randomUUID(),
          name,
          purpose: "",
          timing: "",
          dosage: "",
          precautions: "",
          timingCategory: "Not Specified" as TimingCategory,
          brandSuggestionsAndGuidelines: "",
        },
        ...plan.supplements,
      ],
    };
    setPlan(newPlan);
    try {
      await handleSaveSupplementsWithData(newPlan);
    } catch (error) {
      console.error("Failed to save new supplement:", error);
      toast.error("Failed to save new supplement. Please try again.");
    }
  };

  const sortDietPlan = (dietPlan: DayPlan[]) => {
    return [...dietPlan].sort((a, b) => a.day.localeCompare(b.day));
  };

  const addDayPlan = async (day: string) => {
    if (!plan) return;
    const currentDietPlan = getCurrentDietPlan();
    if (!currentDietPlan) return;

    // Create a new day plan for the current diet plan version
    const updatedDietPlanVersions = plan.dietPlanVersions.map((version) => {
      if (version.id === currentDietPlan.id) {
        return {
          ...version,
          dayPlans: sortDietPlan([
            {
              id: crypto.randomUUID(),
              day,
              preMorning: "",
              morning: "",
              midMorning: "",
              lunch: "",
              earlyEvening: "",
              night: "",
              bedtime: "",
            },
            ...version.dayPlans,
          ]),
        };
      }
      return version;
    });

    const newPlan = {
      ...plan,
      dietPlanVersions: updatedDietPlanVersions,
    };

    setPlan(newPlan);
    try {
      await handleSaveDietPlan();
    } catch (error) {
      console.error("Failed to save new diet plan day:", error);
      toast.error("Failed to save new diet plan day. Please try again.");
    }
  };

  const handleDeleteSupplement = async (index: number) => {
    if (!plan) return;
    const newSupplements = [...plan.supplements];
    newSupplements.splice(index, 1);
    const newPlan = { ...plan, supplements: newSupplements };
    setPlan(newPlan);
    try {
      await handleSaveSupplementsWithData(newPlan); // Save immediately after deleting
      setDeleteConfirmation(null);
    } catch (error) {
      console.error("Failed to delete supplement:", error);
      toast.error("Failed to delete supplement. Please try again.");
    }
  };

  const handleDeleteDayPlan = async (index: number) => {
    if (!plan) return;
    const currentDietPlan = getCurrentDietPlan();
    if (!currentDietPlan) return;

    // Delete a day plan from the current diet plan version
    const updatedDietPlanVersions = plan.dietPlanVersions.map((version) => {
      if (version.id === currentDietPlan.id) {
        const newDayPlans = [...version.dayPlans];
        newDayPlans.splice(index, 1);
        return {
          ...version,
          dayPlans: newDayPlans,
        };
      }
      return version;
    });

    const newPlan = {
      ...plan,
      dietPlanVersions: updatedDietPlanVersions,
    };

    setPlan(newPlan);
    try {
      await handleSaveDietPlan(); // Save immediately after deleting
      setDeleteConfirmation(null);
    } catch (error) {
      console.error("Failed to delete diet plan day:", error);
      toast.error("Failed to delete diet plan day. Please try again.");
    }
  };

  const handleGenerateNewDietPlan = async (
    isSingleDayPlan: boolean,
    includeCalorieBreakdown: boolean,
    includeFoodMeasurements: boolean,
    maxCaloriesPerDay: number | null,
    foodInclusions: string,
    foodExclusions: string,
    preferredCuisines: string,
    selectedMealTypes: string[]
  ) => {
    if (!plan) return;
    setIsGeneratingNewPlan(true);
    setIsShowingDietDialog(false);
    // Reset retry count and progress when starting
    setRetryCount(0);
    setGenerateNewPlanProgress(0);
    progressStartTimeRef.current = Date.now();

    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      const apiUrl = getApiUrl();
      if (!apiUrl) throw new Error("API URL is not configured");

      const response = await fetch(`${apiUrl}/diet-plan/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reportId,
          singleDayPlan: isSingleDayPlan,
          includeCalorieBreakdown,
          includeFoodMeasurements,
          maxCaloriesPerDay: maxCaloriesPerDay || 0,
          foodInclusions,
          foodExclusions,
          preferredCuisines,
          selectedMealTypes,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        // Check specifically for the DIET_PLAN_VERSIONS_EXHAUSTED error code
        if (result.errorCode === "DIET_PLAN_VERSIONS_EXHAUSTED") {
          throw new Error(result.message);
        }
        throw new Error(result.message || "Failed to generate new diet plan");
      }

      // Fetch the updated plan data
      const updatedPlan = await fetchPlan();

      if (
        updatedPlan &&
        updatedPlan.dietPlanVersions &&
        updatedPlan.dietPlanVersions.length > 0
      ) {
        // Find the latest version by version number
        const latestVersion = [...updatedPlan.dietPlanVersions].sort(
          (a, b) => b.versionNumber - a.versionNumber
        )[0];

        // Force selection of the latest version
        setSelectedDietPlanId(latestVersion.id);

        toast.success("New diet plan version generated successfully");
      } else {
        toast.success("New diet plan version generated");
      }
    } catch (error) {
      console.error("Error generating new diet plan:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate new diet plan. Please try again."
      );
    } finally {
      setIsGeneratingNewPlan(false);
      // Reset progress when done
      setGenerateNewPlanProgress(0);
      setRetryCount(0);
      progressStartTimeRef.current = null;
    }
  };

  const handleFullPDFDownload = async () => {
    if (!plan) return;

    setIsPdfLoading(true);
    try {
      // Get current session using Supabase auth
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      // Fetch white label config using session token
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/white-label/config`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch white label config");
      }

      const result = await response.json();
      const whiteLabel = result.success ? result.data : undefined;

      // Get the latest diet plan version
      const latestDietPlan = [...plan.dietPlanVersions].sort(
        (a: DietPlan, b: DietPlan) => b.versionNumber - a.versionNumber
      )[0];

      // Generate PDF with white label config
      const pdfInput = {
        plan: {
          supplements: plan.supplements,
          supplementNotes: plan.supplementNotes,
          dietPlan: latestDietPlan.dayPlans,
          dietNotes: latestDietPlan.dietNotes,
          supplementsEnabled: supplementsEnabled,
          dietPlanEnabled: dietPlanEnabled,
        },
        clientInfo,
        whiteLabelConfig: whiteLabel,
      };

      const url = await generateSNDPDF(pdfInput);

      const link = document.createElement("a");
      link.href = url;
      const fileName = `${
        clientInfo?.clientName || "client"
      }_supplements_diet_plan.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleSupplementsPDFDownload = async () => {
    if (!plan) return;

    setIsSupplementsPdfLoading(true);
    try {
      // Get current session using Supabase auth
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      // Fetch white label config using session token
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/white-label/config`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch white label config");
      }

      const result = await response.json();
      const whiteLabel = result.success ? result.data : undefined;

      // Generate PDF with white label config - supplements only
      const pdfInput = {
        plan: {
          supplements: plan.supplements,
          supplementNotes: plan.supplementNotes,
          dietPlan: [],
          dietNotes: "",
          supplementsEnabled: true,
          dietPlanEnabled: false,
        },
        clientInfo,
        whiteLabelConfig: whiteLabel,
      };

      const url = await generateSNDPDF(pdfInput);

      const link = document.createElement("a");
      link.href = url;
      const fileName = `${clientInfo?.clientName || "client"}_supplements.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating supplements PDF:", error);
      toast.error("Failed to generate supplements PDF. Please try again.");
    } finally {
      setIsSupplementsPdfLoading(false);
    }
  };

  const handleDietPlanPDFDownload = async (dietPlanId?: string) => {
    if (!plan) return;

    setIsDietPlanPdfLoading(true);
    try {
      // Get current session using Supabase auth
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      // Fetch white label config using session token
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/white-label/config`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch white label config");
      }

      const result = await response.json();
      const whiteLabel = result.success ? result.data : undefined;

      // Get the specified diet plan version or the current selected one
      const dietPlanToUse =
        plan.dietPlanVersions.find(
          (dp: DietPlan) => dp.id === (dietPlanId || selectedDietPlanId)
        ) || getCurrentDietPlan();

      if (!dietPlanToUse) {
        throw new Error("No diet plan available");
      }

      // Generate PDF with white label config - diet plan only
      const pdfInput = {
        plan: {
          supplements: [],
          supplementNotes: "",
          dietPlan: dietPlanToUse.dayPlans,
          dietNotes: dietPlanToUse.dietNotes,
          supplementsEnabled: false,
          dietPlanEnabled: true,
        },
        clientInfo,
        whiteLabelConfig: whiteLabel,
      };

      const url = await generateSNDPDF(pdfInput);

      const link = document.createElement("a");
      link.href = url;
      const fileName = `${clientInfo?.clientName || "client"}_diet_plan_v${
        dietPlanToUse.versionNumber
      }.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating diet plan PDF:", error);
      toast.error("Failed to generate diet plan PDF. Please try again.");
    } finally {
      setIsDietPlanPdfLoading(false);
    }
  };

  const handleExcelDownload = () => {
    if (!plan) return;

    setIsExcelLoading(true);
    try {
      // Get the latest diet plan version
      const latestDietPlan = [...plan.dietPlanVersions].sort(
        (a: DietPlan, b: DietPlan) => b.versionNumber - a.versionNumber
      )[0];

      const excelInput = {
        plan: {
          supplements: plan.supplements,
          supplementNotes: plan.supplementNotes,
          dietPlan: latestDietPlan.dayPlans,
          dietNotes: latestDietPlan.dietNotes,
          supplementsEnabled: supplementsEnabled,
          dietPlanEnabled: dietPlanEnabled,
        },
        clientInfo,
      };

      const url = generateSNDExcel(excelInput);

      const link = document.createElement("a");
      link.href = url;
      const fileName = `${
        clientInfo?.clientName || "client"
      }_supplements_diet_plan.xlsx`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Failed to generate Excel file. Please try again.");
    } finally {
      setIsExcelLoading(false);
    }
  };

  const handleSaveSupplementsWithData = async (planData?: SnDPlan) => {
    const dataToSave = planData || plan;
    if (!dataToSave) return;
    setIsSaving(true);

    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      const apiUrl = getApiUrl();
      if (!apiUrl) {
        toast.error("API URL not configured");
        return;
      }

      const requestPayload = {
        supplements: dataToSave.supplements,
        supplementNotes: dataToSave.supplementNotes,
      };

      console.log("Saving supplements with payload:", requestPayload);

      const response = await fetch(
        `${apiUrl}/snd-plan/${reportId}/supplements`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestPayload),
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update supplements");
      }

      console.log("Supplements saved successfully:", result);
      toast.success("Supplements updated successfully");
      setEditState(null);
      // Don't fetch from server immediately - the local state should already be correct
      // await fetchPlan();
    } catch (error) {
      console.error("Error updating supplements:", error);
      toast.error("Failed to update supplements. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSupplements = async () => {
    return handleSaveSupplementsWithData();
  };

  const handleSaveDietPlan = async () => {
    if (!plan) return;
    const currentDietPlan = getCurrentDietPlan();
    if (!currentDietPlan) return;

    setIsSaving(true);

    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      const apiUrl = getApiUrl();
      if (!apiUrl) {
        toast.error("API URL not configured");
        return;
      }

      const response = await fetch(`${apiUrl}/diet-plan`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: currentDietPlan.id,
          versionNumber: currentDietPlan.versionNumber,
          dietNotes: currentDietPlan.dietNotes,
          dayPlans: currentDietPlan.dayPlans,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update diet plan");
      }

      toast.success("Diet plan updated successfully");
      setEditState(null);
    } catch (error) {
      console.error("Error updating diet plan:", error);
      toast.error("Failed to update diet plan. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSupplement = async (
    index: number,
    updatedSupplement: Supplement
  ) => {
    if (!plan) return;
    const newSupplements = [...plan.supplements];
    newSupplements[index] = { ...updatedSupplement };
    const newPlan = { ...plan, supplements: newSupplements };
    setPlan(newPlan);
    
    // Save the supplements immediately with the updated data
    await handleSaveSupplementsWithData(newPlan);
  };

  const handleUpdateDayPlan = (index: number, field: string, value: string) => {
    if (!plan) return;
    const currentDietPlan = getCurrentDietPlan();
    if (!currentDietPlan) return;

    // Update the diet plan versions
    const updatedDietPlanVersions = plan.dietPlanVersions.map((version) => {
      if (version.id === currentDietPlan.id) {
        const newDayPlans = [...version.dayPlans];
        newDayPlans[index] = {
          ...newDayPlans[index],
          [field]: value,
        };

        // Update label if day is changing
        if (field === "day") {
          const currentLabel = newDayPlans[index].label;
          if (
            !currentLabel ||
            currentLabel === `Day ${newDayPlans[index].day}`
          ) {
            newDayPlans[index].label = `Day ${value}`;
          }
        }

        return {
          ...version,
          dayPlans: field === "day" ? sortDietPlan(newDayPlans) : newDayPlans,
        };
      }
      return version;
    });

    const newPlan = {
      ...plan,
      dietPlanVersions: updatedDietPlanVersions,
    };

    setPlan(newPlan);
  };

  const handleAutoPopulate = async () => {
    if (!plan || !plan.supplements.length) return;

    setIsAutoPopulating(true);
    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      const apiUrl = getApiUrl();
      if (!apiUrl) {
        toast.error("API URL not configured");
        return;
      }

      const response = await fetch(
        `${apiUrl}/supplements/auto-populate/${reportId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(
          result.message || "Failed to auto-populate supplements"
        );
      }

      // Update the plan with the response data
      if (result.data) {
        setPlan(result.data);
        toast.success("Supplements auto-populated successfully");
      }
    } catch (error) {
      console.error("Error auto-populating supplements:", error);
      toast.error("Failed to auto-populate supplements. Please try again.");
    } finally {
      setIsAutoPopulating(false);
    }
  };

  // Add this useEffect for progress tracking
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isAutoPopulating) {
      setAutoPopulateProgress(0);
      autoPopulateStartTimeRef.current = Date.now();
      intervalId = setInterval(() => {
        setAutoPopulateProgress((prev) => {
          if (prev >= 98) {
            return 98;
          }
          return prev + 0.3;
        });
      }, 40);
    } else {
      setAutoPopulateProgress(0);
      autoPopulateStartTimeRef.current = null;
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoPopulating]);

  // Get the current active diet plan
  const currentDietPlan = getCurrentDietPlan();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-primary hover:text-primary/80"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back
          </button>
        </div>
        <div className="flex justify-center items-center min-h-[400px]">
          <p className="text-muted-foreground">No plan data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              const referrer = searchParams.get("referrer");
              if (referrer === "existing-report") {
                router.back(); // Go back to the report view
              } else {
                router.push("/dashboard"); // Default to dashboard
              }
            }}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="mr-2" size={16} />
            {searchParams.get("referrer") === "existing-report"
              ? "Back"
              : "Dashboard"}
          </button>
          <div className="flex space-x-4">
            <div>
              <Button
                onClick={handleFullPDFDownload}
                disabled={isPdfLoading}
                className="bg-blue-500 hover:bg-blue-700 text-white"
              >
                <Download className="mr-2" size={16} />
                <span className="hidden md:inline">Download </span>
                <span>{isPdfLoading ? "Generating..." : " PDF"}</span>
              </Button>
              <p className="text-sm text-gray-600 text-center mt-2">(Free)</p>
            </div>
            <div>
              <Button
                onClick={handleExcelDownload}
                disabled={isExcelLoading}
                className="bg-green-500 hover:bg-green-700 text-white"
              >
                <Download className="mr-2" size={16} />
                <span className="hidden md:inline">Download </span>
                <span>{isExcelLoading ? "Generating..." : " Excel"}</span>
              </Button>
              <p className="text-sm text-gray-600 text-center mt-2">(Free)</p>
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">
          {supplementsEnabled && dietPlanEnabled
            ? "Supplements & Diet Plan"
            : supplementsEnabled
            ? "Supplements Plan"
            : dietPlanEnabled
            ? "Diet Plan"
            : "No Plan Available"}
        </h1>
      </div>
      {clientInfo && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <div className="flex flex-wrap -mx-2">
            <div className="w-full md:w-1/2 px-2 mb-4">
              <p>
                <strong>Client Name:</strong> {clientInfo.clientName}
              </p>
              <p>
                <strong>Gender:</strong> {formatGender(clientInfo.gender)}
              </p>
              <p>
                <strong>Age:</strong> {clientInfo.age}
              </p>
              {clientInfo.bmi && (
                <p>
                  <strong>BMI:</strong> {clientInfo.bmi}
                </p>
              )}
            </div>
            <div className="w-full md:w-1/2 px-2 mb-4">
              {clientInfo.height && (
                <p>
                  <strong>Height:</strong> {clientInfo.height} cm
                </p>
              )}
              {clientInfo.weight && (
                <p>
                  <strong>Weight:</strong> {clientInfo.weight} kg
                </p>
              )}
              {clientInfo.waist && (
                <p>
                  <strong>Waist:</strong> {clientInfo.waist} in
                </p>
              )}
              {clientInfo.diet && (
                <p>
                  <strong>Diet:</strong> {formatDiet(clientInfo.diet)}
                </p>
              )}
            </div>
            {clientInfo.lifestyleHabits &&
              clientInfo.lifestyleHabits.length > 0 && (
                <div className="w-full px-2 mb-4">
                  <p>
                    <strong>Lifestyle Habits:</strong>{" "}
                    {clientInfo.lifestyleHabits
                      .map((habit) => formatEnumValue(habit))
                      .join(", ")}
                  </p>
                </div>
              )}
            {clientInfo.existingConditions &&
              clientInfo.existingConditions.length > 0 && (
                <div className="w-full px-2 mb-4">
                  <p>
                    <strong>Known Conditions:</strong>{" "}
                    {clientInfo.existingConditions
                      .map((condition) =>
                        formatEnumValue(condition, {
                          preserveSlashes: true,
                        })
                      )
                      .join(", ")}
                  </p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Supplements Section */}
      {supplementsEnabled && (
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center space-x-4">
              <CardTitle>Supplements</CardTitle>
              {plan.supplements && plan.supplements.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleSupplementsPDFDownload}
                    disabled={isSupplementsPdfLoading}
                    size="sm"
                    variant="outline"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {isSupplementsPdfLoading
                      ? "Generating..."
                      : "Download Supplements PDF"}
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            onClick={handleAutoPopulate}
                            disabled={
                              isAutoPopulating ||
                              !supplementsAutoPopulationEnabled
                            }
                            size="sm"
                            variant="outline"
                            className="relative overflow-hidden"
                          >
                            {isAutoPopulating && (
                              <div
                                className="absolute left-0 top-0 h-full bg-blue-100 transition-all duration-200"
                                style={{ width: `${autoPopulateProgress}%` }}
                              />
                            )}
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {isAutoPopulating ? (
                                <>
                                  <span className="animate-spin">&#9696;</span>
                                  <span>
                                    Auto-Populating...{" "}
                                    {Math.round(autoPopulateProgress)}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Wand2 className="mr-2 h-4 w-4" />
                                  Auto-Populate Brands
                                </>
                              )}
                            </span>
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!supplementsAutoPopulationEnabled && (
                        <TooltipContent>
                          <p>
                            Auto Population of Brand Suggestions & Guidelines
                            only enabled for Elite Users. Upgrade Now!
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            onClick={() => setIsManageDialogOpen(true)}
                            disabled={!supplementsAutoPopulationEnabled}
                            size="sm"
                            variant="outline"
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Manage Auto-Populate
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!supplementsAutoPopulationEnabled && (
                        <TooltipContent>
                          <p>
                            Auto Population of Brand Suggestions & Guidelines
                            only enabled for Elite Users. Upgrade Now!
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            <Button
              onClick={() => setIsAddSupplementModalOpen(true)}
              variant="outline"
              className="h-9"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Supplement
            </Button>
          </CardHeader>
          {/* Add the modal component */}
          <NewSupplementModal
            isOpen={isAddSupplementModalOpen}
            onClose={() => setIsAddSupplementModalOpen(false)}
            onAdd={addSupplement}
          />
          <CardContent className="space-y-6">
            {plan.supplements.map((supplement, index) => (
              <SupplementCard
                key={supplement.id}
                supplement={supplement}
                index={index}
                isEditing={editingSupplementId === supplement.id}
                onUpdate={handleUpdateSupplement}
                onEditToggle={() => {
                  setEditingSupplementId(
                    editingSupplementId === supplement.id ? null : supplement.id
                  );
                }}
                onDeleteClick={() =>
                  setDeleteConfirmation({
                    isOpen: true,
                    itemType: "supplement",
                    itemName: supplement.name,
                    index: index,
                  })
                }
                allSupplements={plan.supplements}
              />
            ))}

            {/* Supplement Notes */}
            <div className="mt-8 pt-6 border-t">
              <EditableField
                label="Supplement Notes"
                value={plan.supplementNotes || ""}
                isEditing={editState?.fieldName === "supplementNotes"}
                onEdit={() => setEditState({ fieldName: "supplementNotes" })}
                onChange={(value) =>
                  setPlan({ ...plan, supplementNotes: value })
                }
                onSave={() => setEditState(null)}
                onCancel={handleCancel}
                handleSave={handleSaveSupplements}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diet Plan Section */}
      {dietPlanEnabled && (
        <>
          <NewDietPlanModal
            isOpen={isAddDietPlanModalOpen}
            onClose={() => setIsAddDietPlanModalOpen(false)}
            onAdd={addDayPlan}
            existingDays={currentDietPlan?.dayPlans.map((day) => day.day) || []}
          />

          {/* Diet Instructions Dialog */}
          <Suspense fallback={<div>Loading...</div>}>
            {isShowingDietDialog && (
              <DietInstructionsDialog
                isOpen={isShowingDietDialog}
                onClose={() => setIsShowingDietDialog(false)}
                onProceed={handleGenerateNewDietPlan}
              />
            )}
          </Suspense>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center space-x-4">
                <CardTitle>Diet</CardTitle>

                {currentDietPlan && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        disabled={isDietPlanPdfLoading}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (plan.dietPlanVersions.length === 1) {
                            handleDietPlanPDFDownload(); // Directly call if only one version
                          }
                        }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {isDietPlanPdfLoading
                          ? "Generating..."
                          : "Download Diet PDF"}
                        {plan.dietPlanVersions.length > 1 && (
                          <ChevronDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    {plan.dietPlanVersions.length > 1 && (
                      <DropdownMenuContent>
                        {plan.dietPlanVersions.map((version) => (
                          <DropdownMenuItem
                            key={version.id}
                            onClick={() =>
                              handleDietPlanPDFDownload(version.id)
                            }
                          >
                            Version {version.versionNumber}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    )}
                  </DropdownMenu>
                )}
              </div>

              {/* Add a button to generate a new diet plan version */}
              <div>
                <Button
                  onClick={() => setIsShowingDietDialog(true)}
                  variant="outline"
                  className="h-9 relative overflow-hidden"
                  disabled={isGeneratingNewPlan}
                >
                  {isGeneratingNewPlan && (
                    <div
                      className="absolute left-0 top-0 h-full bg-blue-100 transition-all duration-200"
                      style={{ width: `${generateNewPlanProgress}%` }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isGeneratingNewPlan ? (
                      <>
                        <span className="animate-spin">&#9696;</span>
                        <span>
                          {retryCount > 0
                            ? `Retrying... ${Math.round(
                                generateNewPlanProgress
                              )}%`
                            : `Generating... ${Math.round(
                                generateNewPlanProgress
                              )}%`}
                        </span>
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Plan
                      </>
                    )}
                  </span>
                </Button>
                <p className="text-sm text-gray-600 text-center mt-2">
                  50 credits per plan
                </p>
              </div>
            </CardHeader>

            {/* Display the version tabs */}
            {plan.dietPlanVersions && plan.dietPlanVersions.length > 0 && (
              <div className="px-6 pt-2 pb-4 flex flex-wrap gap-2 border-b">
                {plan.dietPlanVersions
                  .sort(
                    (a: DietPlan, b: DietPlan) =>
                      b.versionNumber - a.versionNumber
                  )
                  .map((version) => (
                    <Button
                      key={version.id}
                      variant={
                        selectedDietPlanId === version.id
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setSelectedDietPlanId(version.id)}
                      className="transition-all duration-200 transform hover:scale-105"
                      size="sm"
                    >
                      Version {version.versionNumber}
                      {version.createdAt && (
                        <span className="ml-2 text-xs opacity-70">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </Button>
                  ))}
              </div>
            )}

            <CardContent className="space-y-6 pt-6">
              {/* Add day button inside the selected version content area */}
              {currentDietPlan && (
                <div className="flex justify-end mb-4">
                  <Button
                    onClick={() => setIsAddDietPlanModalOpen(true)}
                    variant="outline"
                    className="h-9"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Day
                  </Button>
                </div>
              )}

              {/* Display the selected diet plan's content */}
              {currentDietPlan &&
                currentDietPlan.dayPlans.map((dayPlan, index) => (
                  <DayPlanCard
                    key={dayPlan.id}
                    dayPlan={dayPlan}
                    index={index}
                    isEditing={editingDayId === dayPlan.id}
                    onUpdate={handleUpdateDayPlan}
                    onEditToggle={() => {
                      if (editingDayId === dayPlan.id) {
                        setEditingDayId(null);
                      } else {
                        setEditingDayId(dayPlan.id);
                      }
                    }}
                    onDeleteClick={() =>
                      setDeleteConfirmation({
                        isOpen: true,
                        itemType: "diet day",
                        itemName: dayPlan.label || `Day ${dayPlan.day}`,
                        index: index,
                      })
                    }
                    handleSave={handleSaveDietPlan}
                  />
                ))}

              {/* Diet Notes */}
              {currentDietPlan && (
                <div className="mt-8 pt-6 border-t">
                  <EditableField
                    label="Diet Notes"
                    value={currentDietPlan.dietNotes || ""}
                    isEditing={editState?.fieldName === "dietNotes"}
                    onEdit={() => setEditState({ fieldName: "dietNotes" })}
                    onChange={(value) => {
                      const updatedVersions = plan.dietPlanVersions.map((v) =>
                        v.id === currentDietPlan.id
                          ? { ...v, dietNotes: value }
                          : v
                      );
                      setPlan({ ...plan, dietPlanVersions: updatedVersions });
                    }}
                    onSave={() => setEditState(null)}
                    onCancel={handleCancel}
                    handleSave={handleSaveDietPlan}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {deleteConfirmation && (
        <DeleteConfirmDialog
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation(null)}
          onConfirm={() => {
            if (deleteConfirmation.itemType === "supplement") {
              handleDeleteSupplement(deleteConfirmation.index);
            } else {
              handleDeleteDayPlan(deleteConfirmation.index);
            }
          }}
          itemName={deleteConfirmation.itemName}
          itemType={deleteConfirmation.itemType}
        />
      )}

      {/* Add the Manage Supplements Dialog */}
      <ManageSupplementsDialog
        isOpen={isManageDialogOpen}
        onClose={() => setIsManageDialogOpen(false)}
        authClient={authClient}
      />
    </div>
  );
}
