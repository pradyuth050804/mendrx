// File: src/components/CustomSignOffDialog.tsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Save, Upload, X } from "lucide-react";
import { createAuthClient } from "@/lib/supabase-auth";
import toast from "react-hot-toast";
import { getApiUrl } from "@/utils/api";

interface CustomSignOffDialogProps {
  open: boolean;
  onClose: () => void;
}

interface SignOffData {
  name: string;
  designation: string;
  signatureUrl?: string;
}

export const CustomSignOffDialog: React.FC<CustomSignOffDialogProps> = ({
  open,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchSignOff();
    }
  }, [open]);

  const fetchSignOff = async () => {
    try {
      const authClient = createAuthClient();
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!session) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`${getApiUrl()}/custom-signature`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to fetch sign-off details");
      }

      const signOffData: SignOffData = result.data;
      setName(signOffData.name || "");
      setDesignation(signOffData.designation || "");
      if (signOffData.signatureUrl) {
        setSignaturePreview(signOffData.signatureUrl);
      }
    } catch (error) {
      console.error("Error fetching sign-off:", error);
      toast.error("Failed to load sign-off details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        // 1MB limit
        toast.error("File size must be less than 1MB");
        return;
      }
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/heic",
        "image/heif",
      ];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast.error("Only JPG, PNG and HEIC images are allowed");
        return;
      }

      setSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !designation.trim()) {
      toast.error("Name and designation are required");
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

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("designation", designation.trim());
      if (signatureFile) {
        formData.append("signature", signatureFile);
      }

      const response = await fetch(`${getApiUrl()}/custom-signature`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update sign-off");
      }

      toast.success("Sign-off updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating sign-off:", error);
      toast.error("Failed to update sign-off. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeSignature = () => {
    setSignatureFile(null);
    setSignaturePreview("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Custom Sign-Off</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Enter Designation"
              />
            </div>

            <div className="space-y-2">
              <Label>Signature Image</Label>
              {signaturePreview ? (
                <div className="relative inline-block">
                  <img
                    src={signaturePreview}
                    alt="Signature Preview"
                    className="max-h-32 border rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeSignature}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/70">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload signature image
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Supported formats: JPG, PNG, HEIC. Max size: 1MB
              </p>
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={
              isSaving ||
              !name.trim() ||
              !designation.trim() ||
              (!signatureFile && !signaturePreview)
            }
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
