"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Info } from "lucide-react";
import toast from "react-hot-toast";
import { createAuthClient } from "@/lib/supabase-auth";
import { getApiUrl } from "@/utils/api";
import { fetchProtocolData, ProtocolOptions } from "@/lib/protocolDataFetchers";
import { generateProtocolPDF } from "@/utils/protocolPdfGenerator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProtocolDialogProps {
  reportId: string;
  sndPlanExists: boolean | null;
  lifestyleRecExists: boolean | null;
  protocolEnabled: boolean;
  clientName: string;
}

const ProtocolDialog: React.FC<ProtocolDialogProps> = ({
  reportId,
  sndPlanExists,
  lifestyleRecExists,
  protocolEnabled,
  clientName,
}) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ProtocolOptions>({
    includeRCASummary: true,
    includeRCABreakdown: false,
    includeSupplements: sndPlanExists === true,
    includeDietPlan: sndPlanExists === true,
    includeLifestyleRec: lifestyleRecExists === true,
  });

  // Protocol button is enabled if protocol is enabled and either SndPlan or LifestyleRec exists
  const isProtocolButtonEnabled =
    protocolEnabled && (sndPlanExists === true || lifestyleRecExists === true);

  // State to show the disabled reason on tooltip hover
  const disabledReason = !protocolEnabled
    ? "Protocol feature only enabled for Elite Users. Upgrade Now!"
    : sndPlanExists !== true && lifestyleRecExists !== true
    ? "Generate either Supplements & Diet Plan or Lifestyle Recommendations first to create a Protocol."
    : "";

  const handleOptionChange = (key: keyof ProtocolOptions) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleGeneratePDF = async () => {
    setIsLoading(true);
    try {
      const authClient = createAuthClient();
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!session) {
        toast.error("You must be logged in to generate a Protocol.");
        return;
      }

      // Fetch white label configuration
      const apiUrl = getApiUrl();
      if (!apiUrl) {
        throw new Error("API URL is not configured");
      }

      const whiteLabel = await fetch(`${apiUrl}/white-label/config`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((res) => res.json())
        .then((data) => (data.success ? data.data : undefined));

      // Fetch all required data based on selected options
      const protocolData = await fetchProtocolData(
        session.access_token,
        reportId,
        options
      );

      // Generate the PDF
      const pdfUrl = await generateProtocolPDF(
        protocolData,
        options,
        whiteLabel
      );

      // Download the PDF
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `${clientName}_protocol_mendrx.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);

      // Close the dialog
      setOpen(false);
      toast.success("Protocol PDF generated successfully!");
    } catch (error) {
      console.error("Error generating Protocol PDF:", error);
      toast.error("Failed to generate Protocol PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <span tabIndex={!isProtocolButtonEnabled ? 0 : undefined}>
              <Button
                onClick={() => isProtocolButtonEnabled && setOpen(true)}
                disabled={!isProtocolButtonEnabled}
                className={`bg-green-500 hover:bg-green-700 text-white w-64 ${
                  !isProtocolButtonEnabled
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }`}
              >
                Generate Protocol
              </Button>
            </span>
          </TooltipTrigger>
          {disabledReason && (
            <TooltipContent className="bg-black text-white">
              <p className="flex items-center">
                <Info className="h-4 w-4 mr-2" />
                {disabledReason}
              </p>
            </TooltipContent>
          )}
        </Tooltip>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Protocol</DialogTitle>
            <DialogDescription>
              Select which components to include in the Protocol PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rcaSummary"
                checked={options.includeRCASummary}
                onCheckedChange={() => handleOptionChange("includeRCASummary")}
              />
              <Label htmlFor="rcaSummary" className="cursor-pointer">
                Root Cause Analysis Summary
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rcaBreakdown"
                checked={options.includeRCABreakdown}
                onCheckedChange={() =>
                  handleOptionChange("includeRCABreakdown")
                }
              />
              <Label htmlFor="rcaBreakdown" className="cursor-pointer">
                Root Cause Analysis Breakdown
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="supplements"
                checked={options.includeSupplements}
                onCheckedChange={() => handleOptionChange("includeSupplements")}
                disabled={!sndPlanExists}
              />
              <Label
                htmlFor="supplements"
                className={`cursor-pointer ${
                  !sndPlanExists ? "text-gray-400" : ""
                }`}
              >
                Supplements
                {!sndPlanExists && (
                  <span className="ml-2 text-xs text-red-500">
                    (Not generated)
                  </span>
                )}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="dietplan"
                checked={options.includeDietPlan}
                onCheckedChange={() => handleOptionChange("includeDietPlan")}
                disabled={!sndPlanExists}
              />
              <Label
                htmlFor="dietplan"
                className={`cursor-pointer ${
                  !sndPlanExists ? "text-gray-400" : ""
                }`}
              >
                Diet Plan
                {!sndPlanExists && (
                  <span className="ml-2 text-xs text-red-500">
                    (Not generated)
                  </span>
                )}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="lifestylerec"
                checked={options.includeLifestyleRec}
                onCheckedChange={() =>
                  handleOptionChange("includeLifestyleRec")
                }
                disabled={!lifestyleRecExists}
              />
              <Label
                htmlFor="lifestylerec"
                className={`cursor-pointer ${
                  !lifestyleRecExists ? "text-gray-400" : ""
                }`}
              >
                Lifestyle Recommendations
                {!lifestyleRecExists && (
                  <span className="ml-2 text-xs text-red-500">
                    (Not generated)
                  </span>
                )}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePDF}
              className="bg-green-500 hover:bg-green-700 text-white"
              disabled={
                isLoading ||
                !(
                  options.includeRCASummary ||
                  options.includeRCABreakdown ||
                  options.includeSupplements ||
                  options.includeDietPlan ||
                  options.includeLifestyleRec
                )
              }
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">&#9696;</span>
                  <span className="ml-2">Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default ProtocolDialog;
