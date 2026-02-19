// File: src/components/WhiteLabelPreview.tsx
import React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { useLogoCache } from "@/hooks/useLogoCache";

interface PreviewProps {
  type: "LOGO" | "TEXT" | null;
  logo?: File | null;
  text?: string;
  currentLogoUrl?: string | null;
}

const WhiteLabelPreview: React.FC<PreviewProps> = ({
  type,
  logo,
  text,
  currentLogoUrl,
}) => {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const { cachedUrl, isLoading, error } = useLogoCache(currentLogoUrl ?? null);
  React.useEffect(() => {
    if (logo) {
      const url = URL.createObjectURL(logo);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [logo]);

  React.useEffect(() => {
    if (logo) {
      const url = URL.createObjectURL(logo);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [logo]);
  const renderLogo = () => {
    if (type !== "LOGO") {
      return (
        <div className="w-10 h-10 relative">
          <Image
            src="/mendrx_logo.jpg"
            alt="Default Logo"
            fill
            className="object-contain"
          />
        </div>
      );
    }

    if (isLoading) {
      return <div className="w-10 h-10 bg-muted animate-pulse rounded" />;
    }

    if (error) {
      return (
        <div className="w-10 h-10 flex items-center justify-center text-destructive">
          <span className="text-xs">Error</span>
        </div>
      );
    }

    if (previewUrl) {
      return (
        <div className="w-10 h-10 relative">
          <Image
            src={previewUrl}
            alt="Logo Preview"
            fill
            className="object-contain"
          />
        </div>
      );
    }

    if (cachedUrl) {
      return (
        <div className="w-10 h-10 relative">
          <Image
            src={cachedUrl}
            alt="Current Logo"
            fill
            className="object-contain"
            unoptimized={true}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
          <h2 className="text-xl font-bold text-center flex-1">
            Root Cause Analysis Report
          </h2>
          {type === "TEXT" ? (
            <div className="max-w-[200px] text-right text-sm text-gray-600 whitespace-pre-line">
              {text}
            </div>
          ) : (
            renderLogo()
          )}
        </div>

        {/* Sample Client Information */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Client ID:
                </span>
                <span className="text-sm">SAMPLE-123</span>
              </div>
              <div className="flex gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Report Date:
                </span>
                <span className="text-sm">December 26, 2024</span>
              </div>
              <div className="flex gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Gender:
                </span>
                <span className="text-sm">Female</span>
              </div>
              <div className="flex gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Age:
                </span>
                <span className="text-sm">35</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Height:
                </span>
                <span className="text-sm">165 cm</span>
              </div>
              <div className="flex gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Weight:
                </span>
                <span className="text-sm">60 kg</span>
              </div>
              <div className="flex gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Diet:
                </span>
                <span className="text-sm">Vegetarian</span>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Lifestyle Habits:
              </span>
              <span className="text-sm">Regular Exercise, Meditation</span>
            </div>
            <div className="flex gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Known Conditions:
              </span>
              <span className="text-sm">None</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhiteLabelPreview;
