import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAuthClient } from "@/lib/supabase-auth";
import toast from "react-hot-toast";
import { Loader2, Upload, Trash2 } from "lucide-react";
import WatermarkPreview from "@/components/WatermarkPreview";

interface WatermarkDialogProps {
  open: boolean;
  onClose: () => void;
}

const WatermarkDialog: React.FC<WatermarkDialogProps> = ({ open, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingWatermarkUrl, setExistingWatermarkUrl] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (open) {
      fetchExistingWatermark();
    } else {
      // Reset state when dialog closes
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [open]);

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

  const fetchExistingWatermark = async () => {
    try {
      const authClient = createAuthClient();
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!session) return;

      const response = await fetch(`${getApiUrl()}/white-label/config`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch white label config");
      }

      const result = await response.json();
      // The watermarkUrl is now directly a signed URL that can be used
      if (result.data?.watermarkUrl) {
        setExistingWatermarkUrl(result.data.watermarkUrl);
      } else {
        setExistingWatermarkUrl(null);
      }
    } catch (error) {
      console.error("Failed to fetch existing watermark:", error);
      toast.error("Failed to fetch existing watermark");
    }
  };

  const fetchWatermarkSignedUrl = async (filename: string) => {
    try {
      const authClient = createAuthClient();
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!session) return null;

      const response = await fetch(
        `${getApiUrl()}/white-label/watermark-url?filename=${encodeURIComponent(
          filename
        )}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch watermark URL");
      }

      const result = await response.json();
      return result.data?.url;
    } catch (error) {
      console.error("Failed to fetch watermark URL:", error);
      return null;
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    // Generate preview
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const uploadWatermark = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsLoading(true);
    try {
      const authClient = createAuthClient();
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const formData = new FormData();
      formData.append("LOGO", selectedFile);

      const response = await fetch(
        `${getApiUrl()}/white-label/upload-watermark`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload watermark");
      }

      const result = await response.json();

      // Refresh the watermark display
      fetchExistingWatermark();
      toast.success("Watermark uploaded successfully");
    } catch (error) {
      console.error("Error uploading watermark:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload watermark"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const removeWatermark = async () => {
    setIsLoading(true);
    try {
      const authClient = createAuthClient();
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const response = await fetch(
        `${getApiUrl()}/white-label/remove-watermark`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove watermark");
      }

      setExistingWatermarkUrl(null);
      setPreviewUrl(null);
      setSelectedFile(null);
      toast.success("Watermark removed successfully");
    } catch (error) {
      console.error("Error removing watermark:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to remove watermark"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>PDF Watermarking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {existingWatermarkUrl ? (
            <div className="space-y-4">
              <div className="text-sm font-medium">Current Watermark</div>
              <div className="border rounded-md p-4 bg-gray-50">
                <img
                  src={existingWatermarkUrl}
                  alt="Current Watermark"
                  className="max-h-40 mx-auto"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removeWatermark}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Remove Watermark
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="text-sm font-medium mb-2">
                  Upload New Watermark
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept="image/jpeg, image/png"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: JPEG, PNG. Max size: 5MB
                </p>
              </div>

              {previewUrl && (
                <div>
                  <div className="text-sm font-medium mb-2">Preview</div>
                  <div className="border rounded-md p-4 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-2">
                      This is how your watermark will appear on PDFs (size and
                      opacity may vary)
                    </p>
                    <WatermarkPreview watermarkUrl={previewUrl} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          {!existingWatermarkUrl && (
            <Button
              onClick={uploadWatermark}
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload Watermark
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WatermarkDialog;
