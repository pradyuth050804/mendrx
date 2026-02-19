// File: src/components/WhiteLabelDialog.tsx
import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { createAuthClient } from "@/lib/supabase-auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Textarea } from "@/components/ui/textarea";
import WhiteLabelPreview from "@/components/WhiteLabelPreview";
import { useLogoCache, clearLogoCache } from "@/hooks/useLogoCache";
import { useUserData } from "@/contexts/UserContext";

interface WhiteLabelDialogProps {
  open: boolean;
  onClose: () => void;
}

interface WhiteLabelConfig {
  enabled: boolean;
  useParentWhiteLabels: boolean;
  type: "LOGO" | "TEXT";
  logoUrl?: string;
  text?: string;
  signoffSignatureFileName?: string;
  signoffDesignation?: string;
  signoffName?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errorCode?: string;
}

interface LogoUploadResponse {
  success: boolean;
  data?: {
    logoUrl: string;
  };
  error?: string;
}

const WhiteLabelDialog: React.FC<WhiteLabelDialogProps> = ({
  open,
  onClose,
}) => {
  const [step, setStep] = useState<"choose" | "setup" | "confirm">("choose");
  const [type, setType] = useState<"LOGO" | "TEXT" | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [isWhiteLabelEnabled, setIsWhiteLabelEnabled] = useState(false);
  const [currentWhiteLabelType, setCurrentWhiteLabelType] = useState<
    "LOGO" | "TEXT" | null
  >(null);
  const [returningFromConfirm, setReturningFromConfirm] = useState(false);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState<string | null>(null);
  const { session } = useAuth();
  const { userData } = useUserData();
  const { cachedUrl, isLoading: logoLoading } = useLogoCache(currentLogoUrl);
  const [isUploading, setIsUploading] = useState(false);

  const router = useRouter();
  const authClient = createAuthClient();

  const resetState = () => {
    setStep("choose");
    setType(null);
    setLogo(null);
    setText("");
    setFileError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  useEffect(() => {
    if (open) {
      resetState();
      fetchWhiteLabelStatus();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchWhiteLabelStatus();
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

  const handleLogoUpload = async (file: File) => {
    setIsUploading(true);
    setFileError(null);

    try {
      const formData = new FormData();
      formData.append("LOGO", file);

      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      // Clear old logo cache before uploading new one
      if (currentLogoUrl) {
        await clearLogoCache(currentLogoUrl);
      }

      const response = await fetch(`${getApiUrl()}/white-label/upload-logo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }

      const result: LogoUploadResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }
      setCurrentLogoUrl(result.data?.logoUrl || null);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      setFileError(error instanceof Error ? error.message : "Upload failed");
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  // Updated to use Supabase authentication
  const fetchWhiteLabelStatus = async () => {
    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      const response = await fetch(`${getApiUrl()}/white-label/config`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch white label config");
      }

      const result: ApiResponse<WhiteLabelConfig> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch white label config");
      }

      const config = result.data!;
      setIsWhiteLabelEnabled(config.enabled);
      if (config.enabled) {
        setCurrentWhiteLabelType(config.type);
        if (config.type === "LOGO" && config.logoUrl) {
          setCurrentLogoUrl(config.logoUrl);
        } else if (config.type === "TEXT" && config.text) {
          setCurrentText(config.text);
          if (type === "TEXT") {
            setText(config.text);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch white label status:", error);
      toast.error("Failed to fetch white label configuration");
    }
  };

  const handleTypeSelect = (value: "LOGO" | "TEXT") => {
    setType(value);
    setStep("setup");
    if (value === "TEXT" && currentText) {
      setText(currentText);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    setReturningFromConfirm(false);

    if (file) {
      if (file.size > 1024 * 1024) {
        setFileError("File size must be less than 1MB");
        setLogo(null);
        return;
      }
      if (!["image/png", "image/jpeg"].includes(file.type)) {
        setFileError("Only PNG and JPEG files are allowed");
        setLogo(null);
        return;
      }
      setLogo(file);
    } else {
      setLogo(null);
    }
  };

  // Updated to use Supabase authentication
  const handleConfirm = async () => {
    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      if (!isWhiteLabelEnabled) {
        if (!userData || userData.credits < 2000) {
          toast.error(
            "Insufficient credits. You need 2000 credits to enable white labeling."
          );
          return;
        }
      }

      // Handle logo upload or text update
      if (type === "LOGO" && logo) {
        const formData = new FormData();
        formData.append("LOGO", logo);
        const uploadResponse = await fetch(
          `${getApiUrl()}/white-label/upload-logo`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.message || "Failed to upload logo");
        }
      } else if (type === "TEXT") {
        const textResponse = await fetch(
          `${getApiUrl()}/white-label/set-text`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
          }
        );

        if (!textResponse.ok) {
          const error = await textResponse.json();
          throw new Error(error.message || "Failed to set text");
        }
      }

      // Enable white labeling if not already enabled
      if (!isWhiteLabelEnabled) {
        const enableResponse = await fetch(
          `${getApiUrl()}/white-label/enable`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!enableResponse.ok) {
          const error = await enableResponse.json();
          throw new Error(error.message || "Failed to enable white labeling");
        }
      }

      toast.success(
        isWhiteLabelEnabled
          ? "White label settings updated successfully!"
          : "White labeling enabled successfully!"
      );
      onClose();
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update white label settings"
      );
    }
  };

  const renderChooseStep = () => (
    <div className="space-y-6">
      <p className="text-gray-600">
        {isWhiteLabelEnabled
          ? "Update your white labeling preference. Switch between logo and text at any time."
          : "Choose how you want to customize your reports. This requires a one-time payment of 2000 credits."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className={`cursor-pointer transition-all ${
            type === "LOGO"
              ? "ring-2 ring-blue-500"
              : "border hover:border-blue-500"
          }`}
          onClick={() => handleTypeSelect("LOGO")}
        >
          <CardContent className="p-6">
            <div className="h-48 relative mb-4">
              <Image
                src="/white-label-logo-example.png"
                alt="Logo Example"
                fill
                className="object-contain"
              />
            </div>
            <h3 className="font-semibold mb-2">Custom Logo</h3>
            <p className="text-sm text-gray-600">
              Upload your company logo to appear on all reports
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            type === "TEXT"
              ? "ring-2 ring-blue-500"
              : "border hover:border-blue-500"
          }`}
          onClick={() => handleTypeSelect("TEXT")}
        >
          <CardContent className="p-6">
            <div className="h-48 relative mb-4">
              <Image
                src="/white-label-text-example.png"
                alt="Text Example"
                fill
                className="object-contain"
              />
            </div>
            <h3 className="font-semibold mb-2">Custom Text</h3>
            <p className="text-sm text-gray-600">
              Add your name and certification details to all reports
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
  const handleBack = () => {
    if (step === "confirm") {
      setStep("setup");
      setReturningFromConfirm(true);
    } else if (step === "setup") {
      setStep("choose");
      setLogo(null);
      setFileError(null);
      setReturningFromConfirm(false);
    }
  };

  const renderSetupStep = () => (
    <div className="space-y-6">
      {type === "LOGO" ? (
        <div>
          {cachedUrl && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Current Logo:</p>
              {logoLoading ? (
                <div className="w-[100px] h-[100px] bg-muted animate-pulse rounded" />
              ) : (
                <Image
                  src={cachedUrl}
                  alt="Current Logo"
                  width={100}
                  height={100}
                  className="object-contain"
                  unoptimized={true}
                />
              )}
            </div>
          )}
          <Input
            id="logo"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 1024 * 1024) {
                  setFileError("File size must be less than 1MB");
                  return;
                }
                handleLogoUpload(file);
              }
            }}
            disabled={isUploading}
            className="mt-2"
          />
          {fileError && (
            <p className="mt-1 text-red-500 text-sm">{fileError}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Requirements: PNG or JPEG format, maximum 1MB
          </p>

          {isUploading && (
            <p className="mt-2 text-sm text-muted-foreground">
              Uploading logo...
            </p>
          )}
        </div>
      ) : (
        <div>
          {currentText && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Current Text:</p>
              <pre className="text-sm bg-gray-50 p-3 rounded-md">
                {currentText}
              </pre>
            </div>
          )}
          <Textarea
            id="customText"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your credentials or certification details (e.g., John Doe, Certified Nutritionist, BSc)"
            className="mt-2 min-h-[120px]"
          />
          <p className="text-sm text-gray-500 mt-2">
            This text will appear on all your reports. Include your name,
            credentials, and any relevant certifications.
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button
          onClick={
            isWhiteLabelEnabled ? handleConfirm : () => setStep("confirm")
          }
          disabled={
            type === "LOGO"
              ? (!currentLogoUrl && !logo) || fileError !== null || isUploading
              : !text.trim()
          }
        >
          {isWhiteLabelEnabled ? "Update Settings" : "Preview & Continue"}
        </Button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      {!isWhiteLabelEnabled && (
        <Alert>
          <AlertDescription>
            Enabling white labeling will cost <strong>2000 credits</strong>{" "}
            (one-time charge). Your current balance: {userData?.credits}{" "}
            credits.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <h4 className="font-semibold">Preview</h4>
        <p className="text-sm text-muted-foreground mb-4">
          This is how your reports will appear after enabling white labeling.
        </p>
        <WhiteLabelPreview
          type={type}
          logo={logo}
          text={text}
          currentLogoUrl={currentLogoUrl}
        />
      </div>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!isWhiteLabelEnabled && (userData?.credits ?? 0) < 2000}
        >
          {isWhiteLabelEnabled
            ? "Update White Labeling"
            : "Enable White Labeling"}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {step === "choose" && "Choose White Labeling Option"}
            {step === "setup" &&
              (type === "LOGO" ? "Upload Logo" : "Enter Whitelabel Text")}
            {step === "confirm" && "Confirm White Labeling"}
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && renderChooseStep()}
        {step === "setup" && renderSetupStep()}
        {step === "confirm" && renderConfirmStep()}
      </DialogContent>
    </Dialog>
  );
};

export default WhiteLabelDialog;
