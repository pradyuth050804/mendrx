// File: src/components/CustomDisclaimerDialog.tsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Save } from "lucide-react";
import { createAuthClient } from "@/lib/supabase-auth";
import toast from "react-hot-toast";
import { getApiUrl } from "@/utils/api";
import { DEFAULT_DISCLAIMER } from "@/constants/disclaimers";

interface CustomDisclaimerDialogProps {
  open: boolean;
  onClose: () => void;
}

export const CustomDisclaimerDialog: React.FC<CustomDisclaimerDialogProps> = ({
  open,
  onClose,
}) => {
  const [disclaimer, setDisclaimer] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchDisclaimer();
    }
  }, [open]);

  const fetchDisclaimer = async () => {
    try {
      const authClient = createAuthClient();
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!session) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`${getApiUrl()}/user/disclaimer`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to fetch disclaimer");
      }

      // Use default disclaimer if the custom one is null or empty
      const customDisclaimer = result.data?.customDisclaimer;
      setDisclaimer(
        customDisclaimer?.trim() ? customDisclaimer : DEFAULT_DISCLAIMER
      );
    } catch (error) {
      console.error("Error fetching disclaimer:", error);
      toast.error("Failed to load disclaimer. Please try again.");
      // Set default disclaimer in case of error
      setDisclaimer(DEFAULT_DISCLAIMER);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!disclaimer.trim()) {
      toast.error("Disclaimer text cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const authClient = createAuthClient();
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!session) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`${getApiUrl()}/user/disclaimer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ disclaimer: disclaimer.trim() }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update disclaimer");
      }

      toast.success("Disclaimer updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating disclaimer:", error);
      toast.error("Failed to update disclaimer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Custom Disclaimer</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Textarea
              value={disclaimer}
              onChange={(e) => setDisclaimer(e.target.value)}
              placeholder="Enter your custom disclaimer text..."
              className="min-h-[200px]"
            />
          )}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || !disclaimer.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
