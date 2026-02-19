// src/app/reports/[id]/lifestyle-rec/LifestyleRecViewClient.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Plus,
  Save,
  Edit2,
  Trash2,
  X,
  Download,
  Settings, // For column management
  Loader2,
  GripVertical, // For potential drag-and-drop later
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { createAuthClient } from "@/lib/supabase-auth";
import Header from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { generateLifestyleRecPDF } from "@/utils/lifestyleRecommendationsPdfGenerator"; // Needs update for JSON

// --- Interfaces for the new JSON structure ---
type RecommendationItem = Record<string, string>; // Dynamic key-value pairs for attributes

interface RecommendationPanel {
  panelName: string;
  items: RecommendationItem[];
}

// Main data structure received/sent
interface LifestyleRecommendations {
  id: string; // ID of the recommendation record itself
  recommendationData: string; // The JSON string
  createdAt: string;
  updatedAt: string;
  // We won't store the reportId here unless the backend includes it
}

// --- API URL Function ---
const getApiUrl = () => {
  // Same as before
  switch (process.env.NEXT_PUBLIC_ENV) {
    case "production":
      return process.env.NEXT_PUBLIC_PROD_API_URL;
    case "development":
      return process.env.NEXT_PUBLIC_DEV_API_URL;
    default:
      return process.env.NEXT_PUBLIC_LOCAL_API_URL;
  }
};

interface LifestyleRecViewClientProps {
  reportId: string;
}

// --- Utility Functions ---
const deepEqual = (obj1: any, obj2: any): boolean => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

// --- Main Component ---
const LifestyleRecViewClient: React.FC<LifestyleRecViewClientProps> = ({
  reportId,
}) => {
  // Raw data from API
  const [recommendationRecord, setRecommendationRecord] =
    useState<LifestyleRecommendations | null>(null);
  // Parsed and editable representation of recommendationData
  const [editablePanels, setEditablePanels] = useState<RecommendationPanel[]>(
    []
  );
  // Store the initial parsed state to compare for dirtiness
  const [initialPanels, setInitialPanels] = useState<RecommendationPanel[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // State for Modals
  const [isAddPanelModalOpen, setIsAddPanelModalOpen] = useState(false);
  const [isRenamePanelModalOpen, setIsRenamePanelModalOpen] = useState(false);
  const [panelIndexToRename, setPanelIndexToRename] = useState<number | null>(
    null
  );
  const [isDeletePanelModalOpen, setIsDeletePanelModalOpen] = useState(false);
  const [panelIndexToDelete, setPanelIndexToDelete] = useState<number | null>(
    null
  );
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [panelIndexForNewColumn, setPanelIndexForNewColumn] = useState<
    number | null
  >(null);

  const router = useRouter();
  const authClient = createAuthClient();
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Calculate if changes have been made
  const isDirty = useMemo(() => {
    return !deepEqual(editablePanels, initialPanels);
  }, [editablePanels, initialPanels]);

  // --- Data Fetching ---
  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setEditablePanels([]); // Reset state
    setInitialPanels([]);
    setRecommendationRecord(null);
    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/"); // Redirect to login if no session
        return;
      }
      setAuthToken(session.access_token);

      const apiUrl = getApiUrl();
      if (!apiUrl) throw new Error("API URL not configured");

      // Fetch using reportId
      const response = await fetch(
        `${apiUrl}/lifestyle-rec/report/${reportId}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Check if recommendations don't exist vs other errors
          const result = await response.json().catch(() => ({})); // Try to parse error
          if (result?.message?.includes("not found for the specified report")) {
            throw new Error(
              "Lifestyle recommendations have not been generated for this report yet."
            );
          } else {
            throw new Error(
              `Failed to fetch recommendations (${response.status})`
            );
          }
        }
        throw new Error(`Failed to fetch recommendations (${response.status})`);
      }

      const result = await response.json();
      if (!result.success || !result.data?.lifestyleRecommendations) {
        throw new Error(result.message || "Failed to load recommendations");
      }

      const fetchedRecord = result.data
        .lifestyleRecommendations as LifestyleRecommendations;
      setRecommendationRecord(fetchedRecord);

      // Parse the JSON data
      if (fetchedRecord.recommendationData) {
        try {
          const parsedData = JSON.parse(
            fetchedRecord.recommendationData
          ) as RecommendationPanel[];
          // Basic validation if needed (e.g., check if it's an array)
          if (!Array.isArray(parsedData)) {
            throw new Error(
              "Recommendation data is not in the expected format (array of panels)."
            );
          }
          setEditablePanels(parsedData);
          setInitialPanels(JSON.parse(fetchedRecord.recommendationData)); // Store deep copy
        } catch (parseError) {
          console.error("Error parsing recommendationData:", parseError);
          throw new Error(
            "Failed to parse recommendation data from the server."
          );
        }
      } else {
        // Handle case where data is empty/null from backend
        setEditablePanels([]);
        setInitialPanels([]);
      }
    } catch (error) {
      console.error("Error fetching lifestyle recommendations:", error);
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
      // Ensure state reflects no data loaded on error
      setEditablePanels([]);
      setInitialPanels([]);
      setRecommendationRecord(null);
    } finally {
      setIsLoading(false);
    }
  }, [reportId, authClient.auth, router]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // --- Save Changes ---
  const handleSaveChanges = async () => {
    if (!isDirty || !recommendationRecord || !authToken) return;
    setIsSaving(true);
    setError(null);

    try {
      const apiUrl = getApiUrl();
      const jsonDataToSave = JSON.stringify(editablePanels);

      const response = await fetch(
        `${apiUrl}/lifestyle-rec/${recommendationRecord.id}`, // Use the record ID for PUT
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json", // Send raw string but still set header
            Authorization: `Bearer ${authToken}`,
          },
          body: jsonDataToSave, // Send the stringified JSON
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to save changes");
      }

      // Update the main record and reset initial state to saved state
      setRecommendationRecord(
        result.data.lifestyleRecommendations as LifestyleRecommendations
      );
      setInitialPanels(JSON.parse(jsonDataToSave)); // Update initial state
      toast.success("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error);
      setError(
        error instanceof Error ? error.message : "Failed to save changes."
      );
      toast.error(
        `Error: ${error instanceof Error ? error.message : "Failed to save"}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  // --- Panel Operations ---
  const handleAddPanel = (newPanelName: string) => {
    if (!newPanelName.trim()) {
      toast.error("Panel name cannot be empty.");
      return;
    }
    setEditablePanels((prev) => [
      ...prev,
      { panelName: newPanelName.trim(), items: [] },
    ]);
    setIsAddPanelModalOpen(false);
  };

  const handleRenamePanel = (panelIndex: number, newName: string) => {
    if (!newName.trim()) {
      toast.error("Panel name cannot be empty.");
      return;
    }
    setEditablePanels((prev) =>
      prev.map((panel, index) =>
        index === panelIndex ? { ...panel, panelName: newName.trim() } : panel
      )
    );
    setIsRenamePanelModalOpen(false);
    setPanelIndexToRename(null);
  };

  const handleDeletePanel = (panelIndex: number) => {
    setEditablePanels((prev) =>
      prev.filter((_, index) => index !== panelIndex)
    );
    setIsDeletePanelModalOpen(false);
    setPanelIndexToDelete(null);
  };

  // --- Item/Attribute Operations ---
  const handleAddItem = (panelIndex: number) => {
    setEditablePanels((prevPanels) => {
      // Use .map to ensure immutability at all levels
      return prevPanels.map((panel, pIdx) => {
        // If it's not the target panel, return the original panel object
        if (pIdx !== panelIndex) {
          return panel;
        }

        // If it IS the target panel:
        // 1. Determine the keys for the new item based on existing items (if any)
        const existingKeys =
          panel.items.length > 0 ? Object.keys(panel.items[0]) : [];
        const newItem: RecommendationItem = {};
        // Initialize new item with existing keys and empty values
        existingKeys.forEach((key) => (newItem[key] = ""));

        // 2. Return a *new* panel object
        return {
          ...panel, // Copy all properties from the original panel
          // 3. Create a *new* items array by spreading the old items and adding the new one
          items: [...panel.items, newItem],
        };
      });
    });
  };

  const handleDeleteItem = (panelIndex: number, itemIndex: number) => {
    setEditablePanels((prev) =>
      prev.map((panel, pIdx) =>
        pIdx === panelIndex
          ? {
              ...panel,
              items: panel.items.filter((_, iIdx) => iIdx !== itemIndex),
            }
          : panel
      )
    );
    // Close any delete confirmation modal if open for items
  };

  const handleItemChange = (
    panelIndex: number,
    itemIndex: number,
    attributeKey: string,
    newValue: string
  ) => {
    setEditablePanels((prev) =>
      prev.map((panel, pIdx) =>
        pIdx === panelIndex
          ? {
              ...panel,
              items: panel.items.map((item, iIdx) =>
                iIdx === itemIndex
                  ? { ...item, [attributeKey]: newValue }
                  : item
              ),
            }
          : panel
      )
    );
  };

  const handleAddColumn = (panelIndex: number, newColumnName: string) => {
    if (!newColumnName.trim()) {
      toast.error("Column name cannot be empty.");
      return;
    }
    const sanitizedColName = newColumnName.trim();

    setEditablePanels((prev) =>
      prev.map((panel, pIdx) => {
        if (pIdx === panelIndex) {
          // Check if column already exists (only if items exist to check against)
          const colExists =
            panel.items.length > 0 &&
            Object.keys(panel.items[0]).some(
              (key) => key.toLowerCase() === sanitizedColName.toLowerCase()
            );

          if (colExists) {
            toast.error(
              `Column "${sanitizedColName}" already exists in this panel.`
            );
            return panel; // Return unchanged panel
          }

          // --- Resolution Logic ---
          if (panel.items.length === 0) {
            // If the panel has no items, add the first item containing only the new column.
            return {
              ...panel,
              items: [{ [sanitizedColName]: "" }], // Add the first item with the new key
            };
          } else {
            // If items already exist, add the new key with an empty value to all existing items.
            return {
              ...panel,
              items: panel.items.map((item) => ({
                ...item,
                [sanitizedColName]: "", // Add new key with empty value
              })),
            };
          }
          // --- End Resolution Logic ---
        }
        return panel;
      })
    );
    setIsAddColumnModalOpen(false);
    setPanelIndexForNewColumn(null);
  };

  const handleDeleteColumn = (panelIndex: number, columnToDelete: string) => {
    // Add confirmation dialog before calling this
    setEditablePanels((prev) =>
      prev.map((panel, pIdx) => {
        if (pIdx === panelIndex) {
          // Create new items array with the key removed from each item
          const newItems = panel.items.map((item) => {
            const newItem = { ...item };
            delete newItem[columnToDelete];
            return newItem;
          });
          return { ...panel, items: newItems };
        }
        return panel;
      })
    );
    toast.success(`Column "${columnToDelete}" deleted.`);
  };

  // --- Get Dynamic Columns for a Panel ---
  const getPanelColumns = (panelIndex: number): string[] => {
    if (!editablePanels || panelIndex >= editablePanels.length) return [];
    const panel = editablePanels[panelIndex];
    const columnSet = new Set<string>();
    panel.items.forEach((item) => {
      Object.keys(item).forEach((key) => columnSet.add(key));
    });
    // Maybe define a default order or sort them? Alphabetical for now.
    return Array.from(columnSet).sort();
  };

  // --- Download Handlers ---
  const handleDownloadPDF = useCallback(async () => {
    if (!recommendationRecord || !recommendationRecord.recommendationData) {
      toast.error("Recommendations data is not loaded yet.");
      return;
    }

    setIsPdfLoading(true);
    let pdfUrl = "";

    try {
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

      // You MUST update generateLifestyleRecPDF to accept the JSON string or parsed data
      // and handle rendering it correctly (likely into tables).
      pdfUrl = await generateLifestyleRecPDF(
        recommendationRecord.recommendationData,
        whiteLabel
      );

      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `Lifestyle_Recommendations_${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating or downloading PDF:", error);
      toast.error(
        `Failed to generate PDF: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      setIsPdfLoading(false);
    }
  }, [recommendationRecord, reportId]);

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
      </div>
    );
  }

  // Handle case where initial fetch failed but wasn't a 404 for non-existent plan
  if (error && !recommendationRecord && !error.includes("not generated")) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-2" size={16} /> Back to Report
            </button>
          </div>
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            Error fetching recommendations: {error}
            <Button
              onClick={fetchRecommendations}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              Retry
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Handle case where recommendations haven't been generated yet (based on specific error message)
  if (error && error.includes("not generated")) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-2" size={16} /> Back to Report
            </button>
          </div>
          <div className="text-center text-muted-foreground">{error}</div>
          {/* Optionally add a button to trigger generation if applicable */}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header & Save Button */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back to Report
            </button>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                onClick={handleDownloadPDF}
                disabled={isPdfLoading || !recommendationRecord}
                className="bg-blue-500 hover:bg-blue-700 text-white"
                variant="outline"
                size="sm"
              >
                {isPdfLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2" size={16} />
                )}
                <span>Download PDF</span>
              </Button>

              <Button
                onClick={handleSaveChanges}
                disabled={!isDirty || isSaving}
                size="sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={16} /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">
            Lifestyle Recommendations
          </h1>
          {/* Global Error Display for Save/Update issues */}
          {error && error.includes("Failed to save") && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              Error: {error}
            </div>
          )}
        </div>

        {/* Recommendations Panels */}
        <div className="space-y-8">
          {editablePanels.map((panel, panelIndex) => {
            const columns = getPanelColumns(panelIndex);
            return (
              <Card key={`panel-${panelIndex}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                  <div className="flex items-center gap-2">
                    {/* <GripVertical className="cursor-move text-muted-foreground" size={18} /> */}
                    <CardTitle className="flex items-center">
                      {panel.panelName}
                      {/* Rename Panel Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setPanelIndexToRename(panelIndex);
                          setIsRenamePanelModalOpen(true);
                        }}
                        title="Rename Panel"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Add Column Button */}
                    <Button
                      onClick={() => {
                        setPanelIndexForNewColumn(panelIndex);
                        setIsAddColumnModalOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      title="Add Column"
                      className="hidden sm:inline-flex" // Hide on smaller screens maybe
                    >
                      <Plus className="mr-1 h-4 w-4" /> Column
                    </Button>
                    {/* Delete Panel Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive/80"
                      onClick={() => {
                        setPanelIndexToDelete(panelIndex);
                        setIsDeletePanelModalOpen(true);
                      }}
                      title="Delete Panel"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Item Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columns.map((colName) => (
                            <TableHead key={colName}>
                              <div className="flex items-center justify-between gap-1">
                                <span>{colName}</span>
                                {/* Delete Column Button - Consider confirmation */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-muted-foreground hover:text-destructive/80 opacity-50 hover:opacity-100"
                                  onClick={() =>
                                    handleDeleteColumn(panelIndex, colName)
                                  } // Add confirmation!
                                  title={`Delete Column "${colName}"`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableHead>
                          ))}
                          <TableHead className="w-[100px] text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {panel.items.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={columns.length + 1}
                              className="h-24 text-center text-muted-foreground"
                            >
                              No items added to this panel yet.
                            </TableCell>
                          </TableRow>
                        )}
                        {panel.items.map((item, itemIndex) => (
                          <TableRow key={`item-${panelIndex}-${itemIndex}`}>
                            {columns.map((colName) => (
                              <TableCell key={`${colName}-${itemIndex}`}>
                                {/* Make cell editable - Using Textarea for multi-line */}
                                <Textarea
                                  value={item[colName] ?? ""} // Handle potentially undefined keys briefly during adds/deletes
                                  onChange={(e) =>
                                    handleItemChange(
                                      panelIndex,
                                      itemIndex,
                                      colName,
                                      e.target.value
                                    )
                                  }
                                  className="min-h-[60px] w-full p-1 border-transparent focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-y"
                                  placeholder={`Enter ${colName}...`}
                                />
                              </TableCell>
                            ))}
                            <TableCell className="text-right align-top pt-2">
                              {/* Delete Item Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive/80"
                                onClick={() =>
                                  handleDeleteItem(panelIndex, itemIndex)
                                } // Add confirmation?
                                title="Delete Item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Add Item Button */}
                  <div className="flex justify-start mt-4">
                    <Button
                      onClick={() => handleAddItem(panelIndex)}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item (Row)
                    </Button>
                  </div>
                  {/* Add Column Button (alternative position for mobile) */}
                  <Button
                    onClick={() => {
                      setPanelIndexForNewColumn(panelIndex);
                      setIsAddColumnModalOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    title="Add Column"
                    className="sm:hidden mt-2" // Show only on smaller screens
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add Column
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {/* Add New Panel Button */}
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => setIsAddPanelModalOpen(true)}
              variant="secondary"
              size="lg"
              className="w-full max-w-md"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add New Panel
            </Button>
          </div>
        </div>

        {/* Modals */}

        {/* Add Panel Modal */}
        <SimpleInputDialog
          isOpen={isAddPanelModalOpen}
          onClose={() => setIsAddPanelModalOpen(false)}
          onConfirm={handleAddPanel}
          title="Add New Panel"
          label="Panel Name"
          placeholder="e.g., Sleep & Recovery"
          confirmText="Add Panel"
        />

        {/* Rename Panel Modal */}
        <SimpleInputDialog
          isOpen={isRenamePanelModalOpen && panelIndexToRename !== null}
          onClose={() => {
            setIsRenamePanelModalOpen(false);
            setPanelIndexToRename(null);
          }}
          onConfirm={(newName) => {
            if (panelIndexToRename !== null)
              handleRenamePanel(panelIndexToRename, newName);
          }}
          title="Rename Panel"
          label="New Panel Name"
          initialValue={
            panelIndexToRename !== null
              ? editablePanels[panelIndexToRename]?.panelName
              : ""
          }
          confirmText="Rename Panel"
        />

        {/* Delete Panel Modal */}
        <ConfirmationDialog
          isOpen={isDeletePanelModalOpen && panelIndexToDelete !== null}
          onClose={() => {
            setIsDeletePanelModalOpen(false);
            setPanelIndexToDelete(null);
          }}
          onConfirm={() => {
            if (panelIndexToDelete !== null)
              handleDeletePanel(panelIndexToDelete);
          }}
          title="Delete Panel"
          description={`Are you sure you want to delete the panel "${
            panelIndexToDelete !== null
              ? editablePanels[panelIndexToDelete]?.panelName
              : ""
          }" and all its items? This action cannot be undone.`}
          confirmText="Delete Panel"
          isDestructive
        />

        {/* Add Column Modal */}
        <SimpleInputDialog
          isOpen={isAddColumnModalOpen && panelIndexForNewColumn !== null}
          onClose={() => {
            setIsAddColumnModalOpen(false);
            setPanelIndexForNewColumn(null);
          }}
          onConfirm={(newColName) => {
            if (panelIndexForNewColumn !== null)
              handleAddColumn(panelIndexForNewColumn, newColName);
          }}
          title={`Add Column to "${
            panelIndexForNewColumn !== null
              ? editablePanels[panelIndexForNewColumn]?.panelName
              : ""
          }"`}
          label="New Column Name"
          placeholder="e.g., Example Usage, Frequency"
          confirmText="Add Column"
        />
      </main>
    </div>
  );
};

export default LifestyleRecViewClient;

// --- Reusable Simple Input Dialog ---
interface SimpleInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  confirmText?: string;
  isLoading?: boolean;
}

const SimpleInputDialog: React.FC<SimpleInputDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  label,
  initialValue = "",
  placeholder,
  confirmText = "Confirm",
  isLoading = false,
}) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue); // Reset value when modal opens
    }
  }, [isOpen, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="dialog-input-value">{label}</Label>
              <Input
                id="dialog-input-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
              />
              {/* Basic validation indication can be added here */}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !value.trim()}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                confirmText
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// --- Reusable Confirmation Dialog ---
interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isDestructive?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  isDestructive = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
