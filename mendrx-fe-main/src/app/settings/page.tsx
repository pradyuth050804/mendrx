"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Edit, Image, Droplet } from "lucide-react";
import WhiteLabelDialog from "@/components/WhiteLabelDialog";
import { createAuthClient } from "@/lib/supabase-auth";
import toast from "react-hot-toast";
import Header from "@/components/Header";
import { CustomDisclaimerDialog } from "@/components/CustomDisclaimerDialog";
import { CustomSignOffDialog } from "@/components/CustomSignOffDialog";
import WatermarkDialog from "@/components/WatermarkDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import ContactModal from "@/components/ContactModel";

const SettingsPage = () => {
  const [showWhiteLabelDialog, setShowWhiteLabelDialog] = useState(false);
  const [isWhiteLabelEnabled, setIsWhiteLabelEnabled] = useState(false);
  const [useParentWhiteLabels, setUseParentWhiteLabels] = useState(false);
  const [showDisclaimerDialog, setShowDisclaimerDialog] = useState(false);
  const [showSignOffDialog, setShowSignOffDialog] = useState(false);
  const [showWatermarkDialog, setShowWatermarkDialog] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchWhiteLabelStatus();
  }, []);

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

  const fetchWhiteLabelStatus = async () => {
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
      setIsWhiteLabelEnabled(result.data?.enabled || false);
      setUseParentWhiteLabels(result.data?.useParentWhiteLabels || false);
    } catch (error) {
      console.error("Failed to fetch white label status:", error);
      toast.error("Failed to fetch settings configuration");
    }
  };

  const settingsItems = [
    {
      title: "Logo White Labeling",
      description: isWhiteLabelEnabled
        ? "Customize your generated PDF reports with your branding"
        : "Enable logo white labeling to customize your generated PDF reports (2000 credits required)",
      icon: Image,
      onClick: () => setShowWhiteLabelDialog(true),
      disabled: !useParentWhiteLabels && !isWhiteLabelEnabled,
      disabledMessage: "Only available for Elite subscribers",
    },
    {
      title: "Custom Disclaimer",
      description:
        "Add your custom disclaimer text to your generated PDF reports",
      icon: FileText,
      onClick: () => setShowDisclaimerDialog(true),
      disabled: !useParentWhiteLabels && !isWhiteLabelEnabled,
      disabledMessage: "Enable logo white labeling to customize disclaimer",
    },
    {
      title: "Custom Sign-Off",
      description:
        "Add your personalized signature to your generated PDF reports",
      icon: Edit,
      onClick: () => setShowSignOffDialog(true),
      disabled: !useParentWhiteLabels && !isWhiteLabelEnabled,
      disabledMessage: "Enable logo white labeling to customize sign-off",
    },
    {
      title: "Watermark PDFs",
      description: "Add a subtle watermark to your generated PDF reports",
      icon: Droplet,
      onClick: () => setShowWatermarkDialog(true),
      disabled: !useParentWhiteLabels,
      disabledMessage: "Only available for Elite subscribers",
    },
  ];

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 mb-16">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back
            </button>
          </div>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {!useParentWhiteLabels && !isWhiteLabelEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <p className="text-gray-700">
              Logo White Labeling, Custom Disclaimer, Custom Sign-Off,
              Watermarking PDFs & many more customizations only available for
              Elite subscribers.{" "}
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="font-bold text-green-600 hover:text-green-800 transition-colors"
              >
                Upgrade your plan NOW!
              </button>
            </p>
          </div>
        )}

        <div className="grid gap-6">
          {settingsItems.map((item, index) => (
            <Card
              key={index}
              className={`transition-all ${
                item.disabled ? "opacity-75" : "hover:shadow-md"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h2 className="font-semibold">{item.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                      {item.disabled && !useParentWhiteLabels && (
                        <p className="text-sm text-yellow-600 mt-1">
                          {item.disabledMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline"
                            onClick={item.onClick}
                            disabled={item.disabled}
                          >
                            {item.disabled ? "Locked" : "Configure"}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {item.disabled &&
                        !isWhiteLabelEnabled &&
                        !useParentWhiteLabels && (
                          <TooltipContent>
                            <p>White labeling must be enabled first</p>
                          </TooltipContent>
                        )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <WhiteLabelDialog
          open={showWhiteLabelDialog}
          onClose={() => {
            setShowWhiteLabelDialog(false);
            fetchWhiteLabelStatus();
          }}
        />
        <CustomDisclaimerDialog
          open={showDisclaimerDialog}
          onClose={() => setShowDisclaimerDialog(false)}
        />
        <CustomSignOffDialog
          open={showSignOffDialog}
          onClose={() => setShowSignOffDialog(false)}
        />
        <WatermarkDialog
          open={showWatermarkDialog}
          onClose={() => setShowWatermarkDialog(false)}
        />
        <ContactModal
          isOpen={isContactModalOpen}
          toggleDialog={() => setIsContactModalOpen(false)}
        />
      </div>
    </>
  );
};

export default SettingsPage;
