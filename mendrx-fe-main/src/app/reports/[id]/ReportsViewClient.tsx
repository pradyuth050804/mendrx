// src/app/reports/[id]/ReportViewClient.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Eye, Info, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import BloodPanelSummaryChart from "@/components/BloodPanelSummaryChart";
import BloodPanelDisplay from "@/components/BloodPanelDisplay";
import { createAuthClient } from "@/lib/supabase-auth";
import toast from "react-hot-toast";
import { generatePDF } from "@/utils/pdfGenerator";
import { generateExcel } from "@/utils/excelGenerator";
import SnDPlanButton from "@/components/SnDPlanButton"; // Assuming this is updated to accept props
import { formatGender, formatDiet, formatEnumValue } from "@/utils/formatters";
import NotesEditor from "@/components/NotesEditor";
import { calculateAgeAsOnReportDate } from "@/utils/dateUtils";
import { useUserData } from "@/contexts/UserContext";
import ProtocolDialog from "@/components/ProtocolDialog";
import { generateNotesPDF } from "@/utils/pdfGenerator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components
import { useParameterComments } from "@/contexts/ParameterCommentsContext";

interface BloodMarker {
  parameterName: string;
  value: string;
  units: string;
  result: "OPTIMAL" | "HIGH" | "LOW";
  deviation: number;
  reason: string;
  parameterInfo: ParameterInfo;
}

interface ParameterInfo {
  shortDescription: string;
  minValue: number;
  maxValue: number;
  standardMinValue: number;
  standardMaxValue: number;
  floorRange: number;
  ceilRange: number;
  panelName: string;
}

// Interface for the parsed key of bloodPanelListMap
interface BloodPanelKeyInfo {
  name: string;
  healthScore: string; // Keep as string as it might not always be numeric
  status: string;
}

interface Report {
  id: string;
  client: {
    id: string;
    name: string;
    gender: string;
    birthMonth: string;
    phoneNumber: string;
    email?: string;
  };
  height?: string;
  weight?: string;
  waist?: string;
  diet?: string;
  bmi?: string;
  lifestyleHabits?: string[];
  existingConditions?: string[];
  reportDate: string;
  bloodMarkers: BloodMarker[];
  bloodPanelListMap: {
    [key: string]: BloodMarker[];
  };
  notes: string | null;
}

interface UserData {
  email: string;
  type: string;
  credits: number;
  expiry: string;
  parentDTO: Parent | null;
}

interface Parent {
  useParentWhiteLabels: boolean;
  rcaEnabled: boolean;
  supplementsEnabled: boolean;
  dietPlanEnabled: boolean;
  dietVersioningEnabled: boolean;
  supplementsAutoPopulationEnabled: boolean;
  lifestyleRecEnabled: boolean;
  comparisonEnabled: boolean;
  websiteWhiteLabelLogoFileUrl?: string;
  protocolEnabled: boolean;
}

interface FeaturesResponse {
  sndPlanExists: boolean;
  lifestyleRecExists: boolean;
}

// --- API URL Function (keep existing) ---
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

interface ReportViewClientProps {
  reportId: string;
}

const ReportViewClient: React.FC<ReportViewClientProps> = ({ reportId }) => {
  const [report, setReport] = useState<Report | null>(null);
  const { userData } = useUserData();
  const { fetchParameterComments } = useParameterComments();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const router = useRouter();
  const authClient = createAuthClient();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isNotesDownloading, setIsNotesDownloading] = useState(false);

  // State for feature existence and loading
  const [sndPlanExists, setSndPlanExists] = useState<boolean | null>(null);
  const [lifestyleRecExists, setLifestyleRecExists] = useState<boolean | null>(
    null
  );
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [featuresError, setFeaturesError] = useState<string | null>(null);

  // State for Lifestyle Rec button specifically
  const [isLifestyleRecLoading, setIsLifestyleRecLoading] = useState(false);
  const [lifestyleRecError, setLifestyleRecError] = useState<string | null>(
    null
  );
  const [lifestyleRecProgress, setLifestyleRecProgress] = useState(0);
  const lifestyleRecProgressStartTime = useRef<number | null>(null);
  const [lifestyleRecRetryCount, setLifestyleRecRetryCount] = useState(0);

  // --- useEffect for Loading Progress (Lifestyle Rec) ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isLifestyleRecLoading && !lifestyleRecExists) {
      setLifestyleRecProgress(0);
      lifestyleRecProgressStartTime.current = Date.now();
      intervalId = setInterval(() => {
        setLifestyleRecProgress((prev) => {
          const elapsedTime =
            Date.now() - (lifestyleRecProgressStartTime.current || 0);
          if (prev >= 98 && elapsedTime > 5000) {
            // Reset progress and start time for retry after 5s at 98%
            lifestyleRecProgressStartTime.current = Date.now();
            setLifestyleRecRetryCount((count) => count + 1);
            return 0;
          }
          if (prev >= 98) return 98;
          return prev + 0.784; // Adjust rate as needed
        });
      }, 200);
    } else {
      setLifestyleRecProgress(0);
      setLifestyleRecRetryCount(0);
      lifestyleRecProgressStartTime.current = null;
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLifestyleRecLoading, lifestyleRecExists]);

  // --- useEffect to fetch Report Data and Features Status ---
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchInitialData = async () => {
      setIsLoading(true);
      setFeaturesLoading(true);
      setError(null);
      setFeaturesError(null);

      try {
        const {
          data: { session },
        } = await authClient.auth.getSession();
        if (!session) {
          router.push("/");
          return;
        }
        if (isMounted) setAuthToken(session.access_token);

        const apiUrl = getApiUrl();
        if (!apiUrl) throw new Error("API URL not configured");

        // Fetch Report Data
        const reportResponse = await fetch(`${apiUrl}/reports/${reportId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: abortController.signal,
        });
        if (!reportResponse.ok)
          throw new Error(`Failed to fetch report (${reportResponse.status})`);
        const reportResult = await reportResponse.json();
        if (!reportResult.success)
          throw new Error(
            reportResult.message || "Failed to parse report data"
          );
        if (isMounted) setReport(reportResult.data);

        // Fetch parameter comments
        await fetchParameterComments();

        // Fetch Features Status
        const featuresResponse = await fetch(
          `${apiUrl}/features/${reportId}`, // Use the new endpoint
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            signal: abortController.signal,
          }
        );
        if (!featuresResponse.ok)
          throw new Error(
            `Failed to fetch features status (${featuresResponse.status})`
          );
        const featuresResult = await featuresResponse.json();
        if (!featuresResult.success)
          throw new Error(
            featuresResult.message || "Failed to parse features status"
          );

        if (isMounted) {
          setSndPlanExists(featuresResult.data.sndPlanExists);
          setLifestyleRecExists(featuresResult.data.lifestyleRecExists);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") return;
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        if (isMounted) {
          console.error("Fetch error:", errorMessage); // Log the actual error
          setError("Failed to load report data or features. Please try again."); // User-friendly message
          setFeaturesError("Failed to load features status."); // Specific error for features part
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setFeaturesLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      abortController.abort();
      isMounted = false;
    };
  }, [reportId, authClient.auth, router, fetchParameterComments]);

  // --- Handlers (handleNotesDownload, handleReasonEdit, handlePDFDownload, handleExcelDownload - keep existing) ---
  const handleNotesDownload = async () => {
    if (!report || !report.notes) return;
    setIsNotesDownloading(true);
    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/white-label/config`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch white label config");
      const result = await response.json();
      const whiteLabel = result.success ? result.data : undefined;
      const url = await generateNotesPDF(report, whiteLabel);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.client.name}_rca_summary_mendrx.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating Notes PDF:", error);
      toast.error("Failed to generate Notes PDF. Please try again.");
    } finally {
      setIsNotesDownloading(false);
    }
  };

  const handleReasonEdit = async (
    parameterName: string,
    newReason: string,
    reportId: string
  ) => {
    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/update-reason`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reportId, parameterName, reason: newReason }),
      });
      const result = await response.json();
      if (!result.success)
        throw new Error(result.message || "Failed to update reason");
      if (report) {
        setReport((prev) => {
          if (!prev) return prev;
          const updatedPanelListMap = { ...prev.bloodPanelListMap };
          Object.keys(updatedPanelListMap).forEach((panelKey) => {
            updatedPanelListMap[panelKey] = updatedPanelListMap[panelKey].map(
              (marker) =>
                marker.parameterName === parameterName
                  ? { ...marker, reason: newReason }
                  : marker
            );
          });
          return { ...prev, bloodPanelListMap: updatedPanelListMap };
        });
      }
      toast.success("Reason updated successfully");
    } catch (error) {
      console.error("Error updating reason:", error);
      toast.error("Failed to update reason. Please try again.");
    }
  };

  const handlePDFDownload = async () => {
    if (!report) return;
    setIsPdfLoading(true);
    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/white-label/config`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch white label config");
      const result = await response.json();
      const whiteLabel = result.success ? result.data : undefined;
      const url = await generatePDF(
        { report, consumedCredits: 0, updatedCredits: 0 },
        whiteLabel
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.client.name}_rca_mendrx.pdf`;
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

  const handleExcelDownload = () => {
    if (!report) return;
    setIsExcelLoading(true);
    try {
      const url = generateExcel({
        report,
        consumedCredits: 0,
        updatedCredits: 0,
      });
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.client.name}_rca_mendrx.xlsx`;
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

  // --- Handlers for Lifestyle Rec Button ---
  const handleGenerateLifestyleRec = async () => {
    if (!report || !authToken || !report.bloodPanelListMap) return;

    // *** Derive poorPanels from bloodPanelListMap ***
    const poorPanelsList: string[] = [];
    for (const panelKey in report.bloodPanelListMap) {
      try {
        const panelInfo: BloodPanelKeyInfo = JSON.parse(panelKey);
        if (panelInfo.status && panelInfo.status.toUpperCase() === "POOR") {
          poorPanelsList.push(panelInfo.name); // Add the panel name (e.g., "Blood Health")
        }
      } catch (e) {
        console.error("Failed to parse panel key:", panelKey, e);
        // Optionally handle the error, e.g., skip this key
      }
    }

    // Check if any poor panels were found
    if (poorPanelsList.length === 0) {
      toast.error(
        "Cannot generate recommendations: No panels marked as 'POOR' found in the report."
      );
      // Optionally disable the button earlier if this check is done before clicking
      return;
    }
    // ************************************************

    setIsLifestyleRecLoading(true);
    setLifestyleRecError(null);
    setLifestyleRecRetryCount(0); // Reset retry count on new attempt
    lifestyleRecProgressStartTime.current = Date.now(); // Reset timer

    try {
      const apiUrl = getApiUrl();
      if (!apiUrl) throw new Error("API URL not configured");

      const response = await fetch(`${apiUrl}/lifestyle-rec/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          reportId: report.id,
          poorPanels: poorPanelsList, // Send the derived list
        }),
      });

      const result = await response.json();

      if (!result.success) {
        // Handle specific errors like insufficient credits, already exists, etc.
        if (result.errorCode === "INSUFFICIENT_CREDITS") {
          toast.error(result.message || "Insufficient credits.");
        } else if (result.errorCode === "ALREADY_EXISTS") {
          toast.error(
            result.message || "Recommendations already exist for this report."
          );
          setLifestyleRecExists(true); // Correct the state if BE says it exists
        } else {
          // Handle other specific backend errors if needed
          if (
            result.errorCode === "INVALID_INPUT" &&
            result.message?.includes(
              "Could not find any lifestyle recommendation"
            )
          ) {
            toast.error(
              "Could not generate recommendations. Template data might be missing for the identified poor panels."
            );
          } else {
            throw new Error(
              result.message || "Failed to generate lifestyle recommendations"
            );
          }
        }
        setLifestyleRecError(result.message); // Set error message
      } else {
        // Success
        toast.success("Lifestyle recommendations generated successfully!");
        setLifestyleRecExists(true); // Update state to show "View" button
        // Navigate to the new view page
        router.push(`/reports/${report.id}/lifestyle-rec`);
      }
    } catch (error) {
      console.error("Error generating lifestyle recommendations:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate recommendations. Please try again.";
      setLifestyleRecError(message);
      toast.error(message);
    } finally {
      setIsLifestyleRecLoading(false);
      setLifestyleRecProgress(0); // Reset progress
      lifestyleRecProgressStartTime.current = null;
    }
  };

  const handleViewLifestyleRec = () => {
    if (!report) return;
    router.push(`/reports/${report.id}/lifestyle-rec`);
  };

  // --- Render Logic ---
  if (isLoading) {
    // Keep existing loading spinner
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    // Keep existing error display
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
          <Button onClick={() => router.push("/reports")} variant="outline">
            <ArrowLeft className="mr-2" size={16} />
            Back to Reports
          </Button>
        </main>
      </div>
    );
  }

  if (!report) {
    // Keep existing "Report Not Found" display
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Report Not Found</h2>
            <Button onClick={() => router.push("/reports")} variant="outline">
              <ArrowLeft className="mr-2" size={16} />
              Back to Reports
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Determine if Lifestyle Rec feature is enabled
  const lifestyleRecEnabled = userData?.parentDTO?.lifestyleRecEnabled ?? false; // Default to false if undefined

  return (
    <TooltipProvider>
      {" "}
      {/* Required for Tooltip */}
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              {" "}
              {/* Added flex-wrap and gap */}
              <button
                onClick={() => router.push("/reports")}
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft className="mr-2" size={16} />
                Reports List
              </button>
              <div className="flex space-x-2 sm:space-x-4 flex-wrap gap-2 justify-end">
                {" "}
                {/* Added flex-wrap, gap, justify-end */}
                {/* S&D Plan Button */}
                {authToken && report && (
                  <SnDPlanButton
                    reportId={report.id}
                    onCreditsUpdate={() => {}}
                    getApiUrl={getApiUrl}
                    supplementsEnabled={
                      userData?.parentDTO?.supplementsEnabled ?? false
                    }
                    dietPlanEnabled={
                      userData?.parentDTO?.dietPlanEnabled ?? false
                    }
                    // Pass fetched status and loading state
                    sndPlanExists={sndPlanExists}
                    isLoading={featuresLoading} // Pass the loading state for the initial check
                    // Optional: Pass error state if SnDPlanButton needs to display it
                    // error={featuresError}
                  />
                )}
                {/* Lifestyle Rec Button */}
                <div>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      {/* Wrap button in a span if it's disabled for tooltip to work reliably */}
                      <span tabIndex={!lifestyleRecEnabled ? 0 : undefined}>
                        <Button
                          onClick={
                            lifestyleRecExists
                              ? handleViewLifestyleRec
                              : handleGenerateLifestyleRec
                          }
                          disabled={
                            !lifestyleRecEnabled ||
                            isLifestyleRecLoading ||
                            featuresLoading
                          } // Disable if feature off OR loading generation OR initial features check loading
                          className={`bg-purple-600 hover:bg-purple-700 text-white w-64 flex items-center justify-center gap-2 relative overflow-hidden ${
                            !lifestyleRecEnabled
                              ? "cursor-not-allowed opacity-50"
                              : ""
                          }`}
                        >
                          {/* Progress Bar */}
                          {isLifestyleRecLoading && !lifestyleRecExists && (
                            <div
                              className="absolute left-0 top-0 h-full bg-purple-800 transition-all duration-200"
                              style={{ width: `${lifestyleRecProgress}%` }}
                            />
                          )}
                          {/* Button Content */}
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {featuresLoading ? (
                              <>
                                {" "}
                                {/* Show loading state during initial features check */}
                                <span className="animate-spin">&#9696;</span>
                                <span>Loading...</span>
                              </>
                            ) : isLifestyleRecLoading ? (
                              <>
                                <span className="animate-spin">&#9696;</span>
                                <span>
                                  {lifestyleRecRetryCount > 0
                                    ? "Retrying... "
                                    : "Generating... "}
                                  {Math.round(lifestyleRecProgress)}%
                                </span>
                              </>
                            ) : lifestyleRecExists ? (
                              <>
                                <Eye className="h-4 w-4" />
                                <span>Lifestyle Recommendations</span>
                              </>
                            ) : (
                              <span>Lifestyle Recommendations</span>
                            )}
                          </span>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {/* Tooltip Content - Only show if feature is disabled */}
                    {!lifestyleRecEnabled && (
                      <TooltipContent className="bg-black text-white">
                        <p className="flex items-center">
                          <Info className="h-4 w-4 mr-2" />
                          Lifestyle Recommendations feature only enabled for
                          Elite Users. Upgrade Now!
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  {/* Display Error Message */}
                  {lifestyleRecError && (
                    <p className="text-xs text-red-600 text-center mt-1 max-w-[256px] mx-auto">
                      {lifestyleRecError}
                    </p>
                  )}
                  {/* Credits/Free Text - Only show if feature is enabled */}
                  {lifestyleRecEnabled && !featuresLoading && (
                    <p className="text-sm text-gray-600 text-center mt-2">
                      {lifestyleRecExists ? "(Free)" : "(100 credits)"}
                    </p>
                  )}
                </div>
                {/* RCA PDF Download Button */}
                <div>
                  <Button
                    onClick={handlePDFDownload}
                    disabled={isPdfLoading}
                    className="bg-blue-500 hover:bg-blue-700 text-white"
                  >
                    <Download className="mr-2" size={16} />
                    <span className="hidden md:inline">Download </span>
                    <span>{isPdfLoading ? "Generating..." : "RCA PDF"}</span>
                  </Button>
                  <p className="text-sm text-gray-600 text-center mt-2">
                    (Free)
                  </p>
                </div>
                {/* Protocol Button */}
                {authToken && report && (
                  <div>
                    <ProtocolDialog
                      reportId={report.id}
                      sndPlanExists={sndPlanExists}
                      lifestyleRecExists={lifestyleRecExists}
                      protocolEnabled={
                        userData?.parentDTO?.protocolEnabled ?? false
                      }
                      clientName={report.client.name}
                    />
                    <p className="text-sm text-gray-600 text-center mt-2">
                      (Free)
                    </p>
                  </div>
                )}
                {/* RCA Excel Download Button */}
                {/* <div>
                  <Button
                    onClick={handleExcelDownload}
                    disabled={isExcelLoading}
                    className="bg-green-500 hover:bg-green-700 text-white"
                  >
                    <Download className="mr-2" size={16} />
                    <span className="hidden md:inline">Download </span>
                    <span>
                      {isExcelLoading ? "Generating..." : "RCA Excel"}
                    </span>
                  </Button>
                  <p className="text-sm text-gray-600 text-center mt-2">
                    (Free)
                  </p>
                </div> */}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">RCA Report</h1>
          </div>

          {/* Rest of the component (Client Info, Charts, Panels, Notes) */}
          <div className="max-w-5xl mx-auto">
            {/* Client Info Section */}
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-2">
                  <p className="flex items-baseline">
                    <span className="font-medium text-gray-700 w-32">
                      Client Name:
                    </span>
                    <span>{report.client.name}</span>
                  </p>
                  <p className="flex items-baseline">
                    <span className="font-medium text-gray-700 w-32">
                      Report Date:
                    </span>
                    <span>
                      {new Date(report.reportDate).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                  <p className="flex items-baseline">
                    <span className="font-medium text-gray-700 w-32">
                      Gender:
                    </span>
                    <span>{formatGender(report.client.gender)}</span>
                  </p>
                  <p className="flex items-baseline">
                    <span className="font-medium text-gray-700 w-32">Age:</span>
                    <span>
                      {calculateAgeAsOnReportDate(
                        report.client.birthMonth,
                        report.reportDate
                      )}
                    </span>
                  </p>
                  {report.bmi && (
                    <p className="flex items-baseline">
                      <span className="font-medium text-gray-700 w-32">
                        BMI:
                      </span>
                      <span>{report.bmi}</span>
                    </p>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  {report.height && (
                    <p className="flex items-baseline">
                      <span className="font-medium text-gray-700 w-32">
                        Height:
                      </span>
                      <span>{report.height} cm</span>
                    </p>
                  )}
                  {report.weight && (
                    <p className="flex items-baseline">
                      <span className="font-medium text-gray-700 w-32">
                        Weight:
                      </span>
                      <span>{report.weight} kg</span>
                    </p>
                  )}
                  {report.waist && (
                    <p className="flex items-baseline">
                      <span className="font-medium text-gray-700 w-32">
                        Waist:
                      </span>
                      <span>{report.waist} in</span>
                    </p>
                  )}
                  {report.diet && (
                    <p className="flex items-baseline">
                      <span className="font-medium text-gray-700 w-32">
                        Diet:
                      </span>
                      <span>{formatDiet(report.diet)}</span>
                    </p>
                  )}
                </div>

                {/* Full Width Additional Information */}
                <div className="col-span-1 md:col-span-2 space-y-2">
                  {report.lifestyleHabits &&
                    report.lifestyleHabits.length > 0 && (
                      <p className="flex items-baseline flex-wrap">
                        <span className="font-medium text-gray-700 w-32">
                          Lifestyle Habits:
                        </span>
                        <span className="flex-1">
                          {report.lifestyleHabits
                            .map((habit) => formatEnumValue(habit))
                            .join(", ")}
                        </span>
                      </p>
                    )}
                  {report.existingConditions &&
                    report.existingConditions.length > 0 && (
                      <p className="flex items-baseline flex-wrap">
                        <span className="font-medium text-gray-700 w-32">
                          Known Conditions:
                        </span>
                        <span className="flex-1">
                          {report.existingConditions
                            .map((condition) =>
                              formatEnumValue(condition, {
                                preserveSlashes: true,
                              })
                            )
                            .join(", ")}
                        </span>
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* Charts and Panels */}
            <div className="hidden md:block">
              <BloodPanelSummaryChart
                bloodPanelListMap={report.bloodPanelListMap}
              />
            </div>
            <BloodPanelDisplay
              bloodPanelListMap={report.bloodPanelListMap}
              reportId={report.id}
              onReasonEdit={handleReasonEdit}
            />
            {/* Notes Editor */}
            {report && report.notes !== undefined && (
              <NotesEditor
                notes={report.notes || ""}
                reportId={report.id}
                onNotesUpdate={(newNotes) => {
                  setReport((prev) =>
                    prev
                      ? {
                          ...prev,
                          notes: newNotes,
                        }
                      : null
                  );
                }}
                getApiUrl={getApiUrl}
                onDownloadNotes={handleNotesDownload}
                isNotesDownloading={isNotesDownloading}
              />
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default ReportViewClient;
