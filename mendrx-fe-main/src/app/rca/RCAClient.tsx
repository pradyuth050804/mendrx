// File: src/app/rca/DashboardClient.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { Edit2, ArrowLeft, Download, Eye, Info, FileText } from "lucide-react"; // Added Eye, Info, FileText
import { createAuthClient, AuthClient } from "@/lib/supabase-auth";
import { generatePDF, generateNotesPDF } from "@/utils/pdfGenerator";
import { generateExcel } from "@/utils/excelGenerator";
import DashboardForm from "./RCAForm"; // Ensure RCAForm expects age, setAge again
import { LifeStyleHabitEnum } from "@/enums/lifeStyleHabitEnum";
import { ExistingConditionEnum } from "@/enums/existingConditionEnum";
import ReactMarkdown from "react-markdown";
import BloodPanelDisplay from "@/components/BloodPanelDisplay";
import ResultsTable from "@/components/ResultsTable";
import BloodPanelSummaryChart from "@/components/BloodPanelSummaryChart";
import { useParameterComments } from "@/contexts/ParameterCommentsContext";
import { Button } from "@/components/ui/button";
import SnDPlanButton from "@/components/SnDPlanButton";
import { toast } from "react-hot-toast";
import NotesEditor from "@/components/NotesEditor";
import ClientSelectionDialog from "@/components/ClientSelectionDialog";
import { useUserData } from "@/contexts/UserContext";
import ProtocolDialog from "@/components/ProtocolDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatEnumValue, formatGender } from "@/utils/formatters";
import { ParameterCommentsProvider } from "@/contexts/ParameterCommentsContext";

// --- Interfaces ---

interface ParameterData {
  parameterName: string;
  value: string;
  units: string;
  parameterInfo: ParameterInfo;
}

interface UnitMismatch {
  parameterName: string;
  originalValue: string;
  originalUnit: string;
  convertedValue: string;
  convertedUnit: string;
}

interface ReadFileResponseModel {
  data: Record<string, ParameterData[]>;
  message: string;
  reportId: string;
  largelyDeviatedParams: string[];
  unitMismatches: UnitMismatch[];
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

interface BloodMarker {
  parameterName: string;
  value: string;
  units: string;
  result: "OPTIMAL" | "HIGH" | "LOW";
  deviation: number;
  reason: string;
  parameterInfo: ParameterInfo;
}

interface BloodPanelKeyInfo {
  name: string;
  healthScore: string;
  status: string;
}

// Keep original Report structure related to age/client if needed by backend
// If ReportViewClient version is the standard, adjust here. Assuming original structure for now.
interface Report {
  id: string;
  client: {
    id: string;
    name: string;
    // Keep gender/birthMonth here if they *also* exist nested in analysisResult
    gender: string;
    birthMonth: string;
    phoneNumber: string;
    email?: string;
  };
  // Assume top-level fields might still exist in the /analyse response along nested ones
  gender: string; // Keep top-level if expected from /analyse response
  age: number; // Keep top-level if expected from /analyse response
  reportDate: string;
  bloodMarkers: BloodMarker[];
  bloodPanelListMap: {
    [key: string]: BloodMarker[];
  };
  notes: string | null;
  height?: string;
  weight?: string;
  waist?: string;
  diet?: string;
  bmi?: string;
  lifestyleHabits?: string[];
  existingConditions?: string[];
}

interface AnalysisResult {
  report: Report;
  consumedCredits: number;
  updatedCredits: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
}

interface Client {
  id: string;
  name: string;
  birthMonth: string; // Keep birthMonth here for age calculation on selection
  gender: string;
}

// --- Utility Functions ---

// Keep original calculateAge if ClientSelectionDialog provides birthMonth
const calculateAge = (birthMonth: string) => {
  if (!birthMonth) return 0;
  const [year, month] = birthMonth.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < 1)) {
    age--;
  }
  return age;
};

const calculateBMI = (weightKg: string, heightCm: string): string => {
  const weight = parseFloat(weightKg);
  const heightMeters = parseFloat(heightCm) / 100;
  if (isNaN(weight) || !weight || isNaN(heightMeters) || heightMeters <= 0) {
    return "N/A";
  }
  const bmi = weight / (heightMeters * heightMeters);
  return bmi.toFixed(1);
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

export default function DashboardClient() {
  // --- State Variables (Reverted age/birthMonth handling) ---
  const [clientId, setClientId] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState(""); // Keep age state
  // Removed birthMonth state
  const [reportDate, setReportDate] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [diet, setDiet] = useState("vegetarian");
  const [clientHistoryQuestionnaire, setClientHistoryQuestionnaire] =
    useState<File | null>(null);
  const searchParams = useSearchParams();
  const [clientName, setClientName] = useState("");
  const [showClientSelection, setShowClientSelection] = useState(false);
  const [lifestyleHabits, setLifestyleHabits] = useState<LifeStyleHabitEnum[]>(
    []
  );
  const [existingConditions, setExistingConditions] = useState<
    ExistingConditionEnum[]
  >([]);

  const [bloodTestReports, setBloodTestReports] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] =
    useState<ApiResponse<ReadFileResponseModel> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const authClient: AuthClient = createAuthClient();
  const { userData } = useUserData();
  const [subscriptionMessage, setSubscriptionMessage] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState({
    // Reverted to age error key
    clientName: "",
    gender: "",
    age: "", // Use age key
    reportDate: "",
    bloodTestReport: "",
  });
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);
  const [reportId, setReportId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [fileName, setFileName] = useState<string>("");
  const { fetchParameterComments } = useParameterComments();
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const progressStartTime = useRef<number | null>(null);
  const [isNotesDownloading, setIsNotesDownloading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);

  // --- State for Features (Keep as is) ---
  const [sndPlanExists, setSndPlanExists] = useState<boolean | null>(null);
  const [lifestyleRecExists, setLifestyleRecExists] = useState<boolean | null>(
    null
  );
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [featuresError, setFeaturesError] = useState<string | null>(null);

  // --- State for Lifestyle Rec Button (Keep as is) ---
  const [isLifestyleRecLoading, setIsLifestyleRecLoading] = useState(false);
  const [lifestyleRecError, setLifestyleRecError] = useState<string | null>(
    null
  );
  const [lifestyleRecProgress, setLifestyleRecProgress] = useState(0);
  const lifestyleRecProgressStartTime = useRef<number | null>(null);
  const [lifestyleRecRetryCount, setLifestyleRecRetryCount] = useState(0);

  const hasLoadedClientInfo = useRef(false);
  const isInitialized = useRef(false);

  // --- useEffect Hooks ---

  // useEffect for Auth Check (Keep as is)
  useEffect(() => {
    const checkAuth = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (session) {
        setAuthToken(session.access_token);
        setIsAuthReady(true);
      } else {
        router.push("/");
      }
    };
    checkAuth();
  }, [authClient.auth, router]);

  // useEffect for Search Params (Reverted to use age)
  useEffect(() => {
    if (!isAuthReady || hasLoadedClientInfo.current) return;

    const clientIdParam = searchParams.get("clientId");
    const clientNameParam = searchParams.get("clientName");
    const ageParam = searchParams.get("age"); // Get age param
    const genderParam = searchParams.get("gender");

    if (clientIdParam) {
      setClientId(clientIdParam);
      if (clientNameParam) setClientName(clientNameParam);
      if (ageParam) setAge(ageParam); // Set age state directly
      if (genderParam) setGender(genderParam.toLowerCase());

      hasLoadedClientInfo.current = true;
      const cleanUrl = window.location.pathname;
      router.replace(cleanUrl, { scroll: false });
    } else {
      // Only show client selection if no client ID is present at all
      // If clientId is present but other details are missing, user fills the form
      if (!clientIdParam) {
        setShowClientSelection(true);
      }
    }
  }, [searchParams, router, isAuthReady, clientId]); // Added clientId dependency back

  // useEffect for Form Validation (Reverted to use age)
  useEffect(() => {
    const isFormValid =
      clientId.trim() !== "" &&
      clientName.trim() !== "" &&
      gender !== "" &&
      age.trim() !== "" && // Validate age instead of birthMonth
      reportDate !== "" &&
      bloodTestReports.length > 0 &&
      !fileError;
    setIsSubmitDisabled(!isFormValid);
  }, [
    clientId,
    clientName,
    gender,
    age, // Depend on age
    reportDate,
    bloodTestReports,
    fileError,
  ]);

  // useEffect for Analysis Progress (Keep as is)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isLoading && !analysisResult) {
      setAnalysisProgress(0);
      progressStartTime.current = Date.now();

      intervalId = setInterval(() => {
        setAnalysisProgress((prev) => {
          const elapsedTime = Date.now() - (progressStartTime.current || 0);

          if (prev >= 98 && elapsedTime > 5000) {
            progressStartTime.current = Date.now();
            setRetryCount((count) => count + 1);
            return 0;
          }

          if (prev >= 98) {
            return 98;
          }
          return prev + 0.3;
        });
      }, 350);
    } else {
      setAnalysisProgress(0);
      setRetryCount(0);
      progressStartTime.current = null;
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoading, analysisResult]);

  // Add new useEffect to fetch parameter comments when analysis result is loaded
  useEffect(() => {
    const fetchComments = async () => {
      if (analysisResult) {
        try {
          await fetchParameterComments();
          console.log("Parameter comments fetched successfully after analysis");
        } catch (err) {
          console.error(
            "Error fetching parameter comments after analysis:",
            err
          );
        }
      }
    };
    fetchComments();
  }, [analysisResult, fetchParameterComments]);

  // --- useEffect to Fetch Features Status (Keep as is) ---
  useEffect(() => {
    const fetchFeaturesStatus = async () => {
      if (!analysisResult?.report?.id || !authToken) return;

      setFeaturesLoading(true);
      setFeaturesError(null);
      const currentReportId = analysisResult.report.id;

      try {
        const apiUrl = getApiUrl();
        if (!apiUrl) throw new Error("API URL not configured");

        const featuresResponse = await fetch(
          `${apiUrl}/features/${currentReportId}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

        if (!featuresResponse.ok) {
          throw new Error(
            `Failed to fetch features status (${featuresResponse.status})`
          );
        }

        const featuresResult: ApiResponse<FeaturesResponse> =
          await featuresResponse.json();

        if (!featuresResult.success) {
          throw new Error(
            featuresResult.message || "Failed to parse features status"
          );
        }

        if (analysisResult && analysisResult.report.id === currentReportId) {
          setSndPlanExists(featuresResult.data.sndPlanExists);
          setLifestyleRecExists(featuresResult.data.lifestyleRecExists);
        }
      } catch (error: unknown) {
        if (analysisResult && analysisResult.report.id === currentReportId) {
          const errorMessage =
            error instanceof Error ? error.message : "An error occurred";
          console.error("Fetch features error:", errorMessage);
          setFeaturesError("Failed to load S&D/Lifestyle Rec status.");
          setSndPlanExists(null);
          setLifestyleRecExists(null);
        }
      } finally {
        if (analysisResult && analysisResult.report.id === currentReportId) {
          setFeaturesLoading(false);
        }
      }
    };

    if (analysisResult) {
      fetchFeaturesStatus();
    } else {
      setSndPlanExists(null);
      setLifestyleRecExists(null);
      setFeaturesLoading(true);
      setFeaturesError(null);
    }
  }, [analysisResult, authToken]);

  // --- useEffect for Lifestyle Rec Progress Bar (Keep as is) ---
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
            lifestyleRecProgressStartTime.current = Date.now();
            setLifestyleRecRetryCount((count) => count + 1);
            return 0;
          }
          if (prev >= 98) return 98;
          return prev + 0.784;
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

  // --- Handlers ---

  // Reverted handleClientSelect to use age calculation
  const handleClientSelect = (client: Client) => {
    setClientId(client.id);
    setClientName(client.name);
    // Calculate age from birthMonth provided by ClientSelectionDialog
    setAge(calculateAge(client.birthMonth).toString());
    setGender(client.gender.toLowerCase());
    setShowClientSelection(false);
    hasLoadedClientInfo.current = true;
    // Reset errors related to client selection
    setFormErrors((prev) => ({ ...prev, clientName: "", gender: "", age: "" }));
  };

  // Reverted handleSubmit to send age
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) {
      return;
    }
    setIsLoading(true);
    setError(null);
    setApiResponse(null);
    setReportId(null);
    setAnalysisResult(null);
    setSndPlanExists(null);
    setLifestyleRecExists(null);
    setFeaturesLoading(true);
    setFeaturesError(null);

    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setAuthToken(session.access_token);

      const formData = new FormData();
      const lifestyleHabitsStrings = lifestyleHabits.map((habit) =>
        habit.valueOf()
      );
      const existingConditionsStrings = existingConditions.map((condition) =>
        condition.valueOf()
      );

      bloodTestReports.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("gender", gender);
      formData.append("clientId", clientId);
      formData.append("age", age); // Send age
      // Removed birthMonth formData append
      formData.append("reportDate", reportDate);
      lifestyleHabitsStrings.forEach((habit) =>
        formData.append("lifestyleHabits[]", habit)
      );
      existingConditionsStrings.forEach((condition) =>
        formData.append("existingConditions[]", condition)
      );

      if (height) formData.append("height", height);
      if (weight) formData.append("weight", weight);
      if (waist) formData.append("waist", waist);
      if (diet) formData.append("diet", diet);
      if (clientHistoryQuestionnaire) {
        formData.append(
          "client_history_questionnaire",
          clientHistoryQuestionnaire
        );
      }
      const apiUrl = getApiUrl();
      if (!apiUrl) {
        throw new Error("API URL is not defined");
      }

      const response = await fetch(`${apiUrl}/readfile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result: ApiResponse<ReadFileResponseModel> = await response.json();

      if (!result.success) {
        throw new Error(
          result.message || "An error occurred during file reading"
        );
      }
      setApiResponse(result);
      setReportId(result.data.reportId);
      setIsFormSubmitted(true);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Error submitting client data:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while processing your request. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // handleValueChange (Keep as is)
  const handleValueChange = (
    panelName: string,
    index: number,
    newValue: string
  ) => {
    if (apiResponse?.data?.data) {
      const updatedData = { ...apiResponse.data.data };
      const updatedPanel = [...updatedData[panelName]];
      updatedPanel[index] = { ...updatedPanel[index], value: newValue };
      updatedData[panelName] = updatedPanel;

      setApiResponse({
        ...apiResponse,
        data: { ...apiResponse.data, data: updatedData },
      });
    }
  };

  // handleConfirm (Keep as is)
  const handleConfirm = async () => {
    if (!reportId || !apiResponse?.data?.data) {
      setError(
        "Report ID or data is missing. Please try submitting the form again."
      );
      return;
    }
    setIsLoading(true);
    setAnalysisProgress(0);
    setRetryCount(0);
    progressStartTime.current = Date.now();
    setError(null);
    setAnalysisResult(null);

    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setAuthToken(session.access_token);

      const apiUrl = getApiUrl();
      if (!apiUrl) {
        throw new Error("API URL is not defined");
      }

      const flattenedData = Object.values(apiResponse.data.data).flat();

      const response = await fetch(`${apiUrl}/analyse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reportId,
          bloodReportData: flattenedData,
        }),
      });

      const result: ApiResponse<AnalysisResult> = await response.json();

      if (!response.ok || !result.success) {
        if (result.errorCode === "INSUFFICIENT_CREDITS") {
          toast.error(result.message || "Insufficient credits for analysis.");
        } else {
          toast.error(
            result.message ||
              "Analysis failed. Please check values or try again."
          );
        }
        throw new Error(result.message || "An error occurred during analysis");
      }

      // Fetch parameter comments after successful analysis with force refetch
      try {
        await fetchParameterComments(); // Use force refetch to ensure fresh data
        console.log("Parameter comments fetched successfully");
      } catch (err) {
        console.error("Error fetching parameter comments:", err);
      }

      setAnalysisResult(result.data);

      // if (setUserData && result.data.updatedCredits !== undefined) {
      //   setUserData((prev) =>
      //     prev ? { ...prev, credits: result.data.updatedCredits } : null
      //   );
      //   toast.success(
      //     `Analysis complete! ${result.data.consumedCredits} credits consumed.`
      //   );
      // } else {
      //   toast.success(`Analysis complete!`);
      // }

      // Use client name from analysis result report for filename
      const baseFileName = `${result.data.report.client.name}_rca_mendrx`;
      setFileName(baseFileName);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Error confirming analysis:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while confirming the analysis. Please try again."
      );
      setAnalysisResult(null);
    } finally {
      setIsLoading(false);
      setAnalysisProgress(0);
      progressStartTime.current = null;
    }
  };

  // handleReasonEdit (Keep as is)
  const handleReasonEdit = async (
    parameterName: string,
    newReason: string,
    reportIdToUpdate: string
  ) => {
    if (!reportIdToUpdate) {
      toast.error("Cannot update reason: Report ID missing.");
      return;
    }
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
        throw new Error("API URL is not defined");
      }

      const response = await fetch(`${apiUrl}/update-reason`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reportId: reportIdToUpdate,
          parameterName,
          reason: newReason,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update reason");
      }

      setAnalysisResult((prevResult) => {
        if (!prevResult) return null;
        const updatedPanelListMap = { ...prevResult.report.bloodPanelListMap };
        Object.keys(updatedPanelListMap).forEach((panelKey) => {
          updatedPanelListMap[panelKey] = updatedPanelListMap[panelKey].map(
            (marker) =>
              marker.parameterName === parameterName
                ? { ...marker, reason: newReason }
                : marker
          );
        });
        return {
          ...prevResult,
          report: {
            ...prevResult.report,
            bloodPanelListMap: updatedPanelListMap,
          },
        };
      });

      toast.success("Reason updated successfully");
    } catch (error) {
      console.error("Error updating reason:", error);
      toast.error(
        `Failed to update reason: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // handlePDFDownload (Keep as is)
  const handlePDFDownload = async () => {
    if (!analysisResult) return;
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

      const url = await generatePDF(analysisResult, whiteLabel);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.pdf`;
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

  // handleExcelDownload (Keep as is)
  const handleExcelDownload = () => {
    if (!analysisResult) return;
    setIsExcelLoading(true);
    try {
      const url = generateExcel(analysisResult);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.xlsx`;
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

  // handleNotesDownload (Keep as is)
  const handleNotesDownload = async () => {
    if (!analysisResult || !analysisResult.report.notes) return;
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

      const url = await generateNotesPDF(analysisResult.report, whiteLabel);
      const link = document.createElement("a");
      link.href = url;
      const downloadFileName = `${analysisResult.report.client.name}_rca_summary_mendrx.pdf`;
      link.download = downloadFileName;
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

  // --- Handlers for Lifestyle Rec Button (Keep as is) ---
  const handleGenerateLifestyleRec = async () => {
    if (
      !analysisResult ||
      !authToken ||
      !analysisResult.report.bloodPanelListMap
    ) {
      toast.error("Cannot generate recommendations: Analysis data is missing.");
      return;
    }

    const poorPanelsList: string[] = [];
    try {
      for (const panelKey in analysisResult.report.bloodPanelListMap) {
        const panelInfo: BloodPanelKeyInfo = JSON.parse(panelKey);
        if (panelInfo.status && panelInfo.status.toUpperCase() === "POOR") {
          poorPanelsList.push(panelInfo.name);
        }
      }
    } catch (e) {
      console.error("Failed to parse panel keys from analysis result:", e);
      toast.error(
        "Error processing report data. Cannot determine panels for recommendations."
      );
      return;
    }

    if (poorPanelsList.length === 0) {
      toast.error(
        "Cannot generate recommendations: No panels marked as 'POOR' found in the analysis."
      );
      return;
    }

    setIsLifestyleRecLoading(true);
    setLifestyleRecError(null);
    setLifestyleRecRetryCount(0);
    lifestyleRecProgressStartTime.current = Date.now();

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
          reportId: analysisResult.report.id,
          poorPanels: poorPanelsList,
        }),
      });

      const result: ApiResponse<any> = await response.json();

      if (!result.success) {
        if (result.errorCode === "INSUFFICIENT_CREDITS") {
          toast.error(
            result.message ||
              "Insufficient credits for Lifestyle Recommendations."
          );
          // if (setUserData && result.data?.updatedCredits !== undefined) {
          //   setUserData((prev) =>
          //     prev ? { ...prev, credits: result.data.updatedCredits } : null
          //   );
          // }
        } else if (result.errorCode === "ALREADY_EXISTS") {
          toast.error(
            result.message || "Recommendations already exist for this report."
          );
          setLifestyleRecExists(true);
        } else if (
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
        setLifestyleRecError(result.message || "Generation failed.");
      } else {
        toast.success("Lifestyle recommendations generated successfully!");
        setLifestyleRecExists(true);
        // if (setUserData && result.data?.updatedCredits !== undefined) {
        //   setUserData((prev) =>
        //     prev ? { ...prev, credits: result.data.updatedCredits } : null
        //   );
        // }
        router.push(`/reports/${analysisResult.report.id}/lifestyle-rec`);
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
      setLifestyleRecProgress(0);
      lifestyleRecProgressStartTime.current = null;
    }
  };

  const handleViewLifestyleRec = () => {
    if (!analysisResult?.report?.id) return;
    router.push(`/reports/${analysisResult.report.id}/lifestyle-rec`);
  };

  // handleBack (Keep as is)
  const handleBack = () => {
    if (analysisResult) {
      setAnalysisResult(null);
      setIsFormSubmitted(false);
      setApiResponse(null);
      setReportId(null);
      setSndPlanExists(null);
      setLifestyleRecExists(null);
      setFeaturesLoading(true);
      setFeaturesError(null);
      router.push("/dashboard");
    } else if (isFormSubmitted) {
      setIsFormSubmitted(false);
      setApiResponse(null);
      setReportId(null);
      setError(null);
    } else {
      router.back();
    }
  };

  // Reverted validateField to check age
  const validateField = (name: string, value: string) => {
    let error = "";
    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      // Use more descriptive names in error messages
      const fieldName =
        name === "clientName"
          ? "Client Name"
          : name === "bloodTestReport"
          ? "Blood Test Report"
          : name.charAt(0).toUpperCase() + name.slice(1);
      error = `${fieldName} is required`;
    } else if (
      name === "age" &&
      (isNaN(Number(trimmedValue)) || Number(trimmedValue) <= 0)
    ) {
      error = "Age must be a valid positive number";
    } else if (name === "reportDate" && value) {
      // Keep date validation
      const selectedDate = new Date(value);
      const today = new Date();
      selectedDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        error = "Report date cannot be in the future";
      }
    }
    // Removed birthMonth validation

    setFormErrors((prev) => ({ ...prev, [name]: error }));
  };

  // --- Render Logic ---

  const lifestyleRecEnabled = userData?.parentDTO?.lifestyleRecEnabled ?? false;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-4">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="mr-2" size={16} />
              {analysisResult
                ? "Dashboard"
                : isFormSubmitted
                ? "Edit Form"
                : "Back"}
            </button>

            {/* Action Buttons (Only show after analysis) */}
            {analysisResult && (
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 w-full sm:w-auto sm:justify-end">
                {/* S&D Plan Button */}
                {authToken && analysisResult && (
                  <SnDPlanButton
                    reportId={analysisResult.report.id}
                    onCreditsUpdate={(newCredits) => {
                      // if (setUserData) {
                      //   setUserData((prev) =>
                      //     prev ? { ...prev, credits: newCredits } : null
                      //   );
                      // }
                    }}
                    getApiUrl={getApiUrl}
                    supplementsEnabled={
                      userData?.parentDTO?.supplementsEnabled ?? false
                    }
                    dietPlanEnabled={
                      userData?.parentDTO?.dietPlanEnabled ?? false
                    }
                    sndPlanExists={sndPlanExists}
                    isLoading={featuresLoading}
                  />
                )}

                {/* Lifestyle Rec Button */}
                <div>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
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
                            featuresLoading ||
                            analysisResult?.report.notes === undefined // Optional check
                          }
                          className={`bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-64 flex items-center justify-center gap-2 relative overflow-hidden ${
                            !lifestyleRecEnabled
                              ? "cursor-not-allowed opacity-50"
                              : ""
                          }`}
                        >
                          {isLifestyleRecLoading && !lifestyleRecExists && (
                            <div
                              className="absolute left-0 top-0 h-full bg-purple-800 transition-all duration-200"
                              style={{ width: `${lifestyleRecProgress}%` }}
                            />
                          )}
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {featuresLoading ? (
                              <>
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
                              <span>Generate Lifestyle Recs</span>
                            )}
                          </span>
                        </Button>
                      </span>
                    </TooltipTrigger>
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
                  {lifestyleRecError && (
                    <p className="text-xs text-red-600 text-center mt-1 max-w-[256px] mx-auto">
                      {lifestyleRecError}
                    </p>
                  )}
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
                {authToken && analysisResult && (
                  <ProtocolDialog
                    reportId={analysisResult.report.id}
                    sndPlanExists={sndPlanExists}
                    lifestyleRecExists={lifestyleRecExists}
                    protocolEnabled={
                      userData?.parentDTO?.protocolEnabled ?? false
                    }
                    clientName={analysisResult.report.client.name}
                  />
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
            )}
          </div>

          {/* Central Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center">
              {error}
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800 text-center">
            {analysisResult ? "Root Cause Analysis" : "RCA Input Information"}
          </h1>

          {/* Content Area: Form or Results */}
          {!isFormSubmitted ? (
            // --- RCA Input Form ---
            <DashboardForm
              clientId={clientId}
              setClientId={setClientId}
              clientName={clientName}
              setClientName={setClientName}
              gender={gender}
              setGender={setGender}
              age={age} // Pass age state
              setAge={setAge} // Pass age setter
              // Removed birthMonth props
              bloodTestReports={bloodTestReports}
              setBloodTestReports={setBloodTestReports}
              reportDate={reportDate}
              setReportDate={setReportDate}
              height={height}
              setHeight={setHeight}
              weight={weight}
              setWeight={setWeight}
              waist={waist}
              setWaist={setWaist}
              diet={diet}
              setDiet={setDiet}
              lifestyleHabits={lifestyleHabits}
              setLifestyleHabits={setLifestyleHabits}
              existingConditions={existingConditions}
              setExistingConditions={setExistingConditions}
              clientHistoryQuestionnaire={clientHistoryQuestionnaire}
              setClientHistoryQuestionnaire={setClientHistoryQuestionnaire}
              handleSubmit={handleSubmit}
              isLoading={isLoading && !analysisResult}
              isSubmitDisabled={isSubmitDisabled}
              formErrors={formErrors}
              validateField={validateField}
              fileError={fileError}
              getApiUrl={getApiUrl}
              searchParams={searchParams}
            />
          ) : (
            // --- Verification Table or Analysis Results ---
            <div className="max-w-5xl mx-auto">
              {/* Client Info Display */}
              <div className="bg-gray-100 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p>
                      <strong>Client Name:</strong> {clientName}
                    </p>
                    <p>
                      <strong>Report Date:</strong>{" "}
                      {reportDate
                        ? new Date(reportDate).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "N/A"}
                    </p>
                    <p>
                      <strong>Gender:</strong> {formatGender(gender)}
                    </p>
                    <p>
                      <strong>Age:</strong> {age}
                    </p>{" "}
                    {/* Display age state */}
                    {weight && height && (
                      <p>
                        <strong>BMI:</strong> {calculateBMI(weight, height)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {height && (
                      <p>
                        <strong>Height:</strong> {height} cm
                      </p>
                    )}
                    {weight && (
                      <p>
                        <strong>Weight:</strong> {weight} kg
                      </p>
                    )}
                    {waist && (
                      <p>
                        <strong>Waist:</strong> {waist} in
                      </p>
                    )}
                    {diet && (
                      <p>
                        <strong>Diet:</strong> {formatEnumValue(diet)}
                      </p>
                    )}
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    {lifestyleHabits && lifestyleHabits.length > 0 && (
                      <p className="flex items-baseline flex-wrap">
                        <span className="font-medium text-gray-700 w-32 shrink-0">
                          Lifestyle Habits:
                        </span>
                        <span className="flex-1">
                          {lifestyleHabits
                            .map((habit) => formatEnumValue(habit))
                            .join(", ")}
                        </span>
                      </p>
                    )}
                    {existingConditions && existingConditions.length > 0 && (
                      <p className="flex items-baseline flex-wrap">
                        <span className="font-medium text-gray-700 w-32 shrink-0">
                          Known Conditions:
                        </span>
                        <span className="flex-1">
                          {existingConditions
                            .map((cond) =>
                              formatEnumValue(cond, { preserveSlashes: true })
                            )
                            .join(", ")}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Conditional Rendering: Analysis Result OR Verification Table */}
              {analysisResult ? (
                // --- Analysis Result View ---
                <>
                  <div className="hidden md:block">
                    <BloodPanelSummaryChart
                      bloodPanelListMap={
                        analysisResult.report.bloodPanelListMap
                      }
                    />
                  </div>
                  <ParameterCommentsProvider>
                    <BloodPanelDisplay
                      bloodPanelListMap={
                        analysisResult.report.bloodPanelListMap
                      }
                      reportId={analysisResult.report.id}
                      onReasonEdit={handleReasonEdit}
                    />
                  </ParameterCommentsProvider>
                  {analysisResult.report.notes !== undefined && (
                    <NotesEditor
                      notes={analysisResult.report.notes || ""}
                      reportId={analysisResult.report.id}
                      onNotesUpdate={(newNotes) => {
                        setAnalysisResult((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            report: {
                              ...prev.report,
                              notes: newNotes,
                            },
                          };
                        });
                      }}
                      getApiUrl={getApiUrl}
                      onDownloadNotes={handleNotesDownload}
                      isNotesDownloading={isNotesDownloading}
                    />
                  )}
                </>
              ) : apiResponse && apiResponse.success ? (
                // --- Verification Table View ---
                <>
                  <div className="mb-4 p-4 border border-yellow-400 bg-yellow-50 rounded">
                    <p className="font-bold text-gray-800 mb-2">
                      ⚠️ Please verify the extracted values below.
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      Review any values highlighted in yellow, as they may
                      require closer attention due to potential extraction
                      deviations or unit conversions. Parameters with unit
                      conversions have an info icon showing original values.
                    </p>
                    <p className="text-sm text-gray-700">
                      Click on a value to edit it if necessary. Once confirmed,
                      click 'Analyse' to proceed.
                    </p>
                  </div>
                  <ResultsTable
                    data={apiResponse.data.data}
                    largelyDeviatedParams={
                      apiResponse?.data.largelyDeviatedParams || []
                    }
                    unitMismatches={
                      apiResponse?.data.unitMismatches || []
                    }
                    handleValueChange={handleValueChange}
                  />
                  <div className="flex flex-col items-center mt-6">
                    {/* Analysis Button with Progress */}
                    <button
                      onClick={handleConfirm}
                      className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 relative overflow-hidden min-w-[180px] h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    >
                      {isLoading && (
                        <div
                          className="absolute left-0 top-0 h-full bg-green-800 transition-all duration-200 ease-linear"
                          style={{ width: `${analysisProgress}%` }}
                        />
                      )}
                      <span className="relative z-10 flex items-center justify-center w-full">
                        {isLoading ? (
                          <>
                            <span className="animate-spin inline-block mr-2">
                              &#9696;
                            </span>
                            <span>
                              {retryCount > 0
                                ? "Retrying... "
                                : "Analysing... "}
                              {Math.round(analysisProgress)}%
                            </span>
                          </>
                        ) : (
                          <span>Analyse Report</span>
                        )}
                      </span>
                    </button>
                    <p className="text-sm text-gray-600 mt-2">(100 credits)</p>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </main>
        {/* Client Selection Dialog */}
        {isAuthReady && (
          <ClientSelectionDialog
            isOpen={showClientSelection}
            onClose={() => {
              setShowClientSelection(false);
              if (!clientId) {
                router.push("/dashboard");
              }
            }}
            onClientSelect={handleClientSelect} // Will now use calculateAge inside
            authToken={authToken || ""}
            getApiUrl={getApiUrl}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
