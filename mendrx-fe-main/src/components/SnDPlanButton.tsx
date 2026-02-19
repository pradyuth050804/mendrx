// src/components/SnDPlanButton.tsx
import { useState, useEffect, lazy, Suspense, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { Eye } from "lucide-react";

interface SnDPlanButtonProps {
  reportId: string;
  onCreditsUpdate: (newCredits: number) => void;
  getApiUrl: () => string | undefined;
  referrer?: string;
  supplementsEnabled: boolean;
  dietPlanEnabled: boolean;
  // --- New Props ---
  sndPlanExists: boolean | null;
  isLoading: boolean; // Passed from parent (true during initial features check)
  // Optional: error?: string | null; // If parent wants to pass error state
}

export default function SnDPlanButton({
  reportId,
  onCreditsUpdate,
  getApiUrl,
  referrer,
  supplementsEnabled,
  dietPlanEnabled,
  // --- Destructure new props ---
  sndPlanExists,
  isLoading: isFeaturesLoading, // Rename prop for clarity within component
}: SnDPlanButtonProps) {
  // State specific to *this button's actions* (generation/viewing)
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [showDietDialog, setShowDietDialog] = useState(false);
  const DietInstructionsDialog = lazy(() => import("./DietInstructionsDialog"));
  const [retryCount, setRetryCount] = useState(0);
  const progressStartTime = useRef<number | null>(null);

  const router = useRouter();
  const authClient = createAuthClient();

  // --- REMOVED: Internal useEffect for checking plan existence ---
  // This logic is now handled by the parent component (ReportViewClient)

  // Handle the "loading" progress bar for plan generation
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    // Only run progress if action is loading AND plan doesn't exist yet
    if (isActionLoading && !sndPlanExists) {
      setGenerateProgress(0);
      progressStartTime.current = Date.now();
      intervalId = setInterval(() => {
        setGenerateProgress((prev) => {
          const elapsedTime = Date.now() - (progressStartTime.current || 0);
          if (prev >= 98 && elapsedTime > 5000) {
            progressStartTime.current = Date.now();
            setRetryCount((count) => count + 1);
            return 0;
          }
          if (prev >= 98) return 98;
          return prev + 0.3;
        });
      }, 300);
    } else {
      setGenerateProgress(0);
      setRetryCount(0);
      progressStartTime.current = null;
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActionLoading, sndPlanExists]); // Depend on action loading and existence state

  // Fetch existing plan (if any) and navigate to it
  const handleViewSnDPlan = async () => {
    setActionError(null);
    setIsActionLoading(true); // Use action loading state
    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      const apiUrl = getApiUrl();
      if (!apiUrl) throw new Error("API URL is not configured");

      // Fetching the plan data is still needed here to navigate correctly
      // or potentially display a quick view/summary if desired later.
      const response = await fetch(`${apiUrl}/snd-plan/${reportId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load plan (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to load plan data");
      }

      const path = `/reports/${reportId}/snd-plan${
        referrer ? `?referrer=${referrer}` : ""
      }`;
      router.push(path);
    } catch (error) {
      console.error("Error fetching supplement and diet plan:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load plan. Please try again.";
      setActionError(message);
      toast.error(message); // Show toast on view error as well
    } finally {
      setIsActionLoading(false); // Use action loading state
    }
  };

  // Either open the dialog or proceed directly (if dietPlan is disabled)
  const handleSnDPlanRequest = () => {
    setActionError(null); // Clear previous errors
    if (!dietPlanEnabled) {
      handleProceedWithPlan(false, false, false, null, "", "", "");
    } else {
      setShowDietDialog(true);
    }
  };

  // Actually generate the plan, with or without instructions
  const handleProceedWithPlan = async (
    isSingleDayPlan: boolean,
    includeCalorieBreakdown: boolean,
    includeFoodMeasurements: boolean,
    maxCaloriesPerDay: number | null,
    foodInclusions: string,
    foodExclusions: string,
    preferredCuisines: string
  ) => {
    setShowDietDialog(false);
    setActionError(null);
    setIsActionLoading(true); // Use action loading state
    setRetryCount(0); // Reset retry count
    progressStartTime.current = Date.now(); // Reset timer

    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      const apiUrl = getApiUrl();
      if (!apiUrl) throw new Error("API URL not configured");

      const response = await fetch(`${apiUrl}/snd-plan/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reportId,
          singleDayPlan: Boolean(isSingleDayPlan),
          includeCalorieBreakdown,
          includeFoodMeasurements,
          maxCaloriesPerDay,
          foodInclusions,
          foodExclusions,
          preferredCuisines,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        // Handle specific errors
        if (result.errorCode === "INSUFFICIENT_CREDITS") {
          toast.error(result.message || "Insufficient credits.");
        } else if (result.errorCode === "ALREADY_EXISTS") {
          // This case should ideally not happen if parent state is correct,
          // but handle defensively.
          toast.error(result.message || "Plan already exists.");
          // Optionally, trigger a refresh of parent state here if possible
        } else {
          throw new Error(result.message || "Failed to generate plan");
        }
        setActionError(result.message);
      } else {
        // Success
        toast.success("S&D Plan generated successfully!");
        if (result.data && result.data.updatedCredits !== undefined) {
          onCreditsUpdate(result.data.updatedCredits); // Call callback from props
        }
        // No need to setHasSnDPlan here, parent component state will update
        const path = `/reports/${reportId}/snd-plan${
          referrer ? `?referrer=${referrer}` : ""
        }`;
        router.push(path);
      }
    } catch (error) {
      console.error("Error generating supplements and diet plan:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate plan. Please try again.";
      setActionError(message);
      toast.error(message);
    } finally {
      setIsActionLoading(false); // Use action loading state
      setGenerateProgress(0); // Reset progress
      progressStartTime.current = null;
    }
  };

  // Use the isLoading prop from parent for the initial loading state
  if (isFeaturesLoading) {
    return (
      <Button
        disabled
        className="bg-yellow-600 hover:bg-yellow-700 text-white opacity-50 w-64" // Added fixed width for consistency
      >
        Loading...
      </Button>
    );
  }

  // If sndPlanExists is still null after loading, it indicates an error fetching features
  if (sndPlanExists === null && !isFeaturesLoading) {
    return (
      <div>
        <Button disabled className="bg-gray-400 text-white w-64">
          Status Unavailable
        </Button>
        <p className="text-xs text-red-600 text-center mt-1 max-w-[256px] mx-auto">
          Could not check plan status.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Display action-specific error */}
      {actionError && (
        <p className="text-xs text-red-600 text-center mt-1 mb-1 max-w-[256px] mx-auto">
          {actionError}
        </p>
      )}

      {/* Show the button only if at least one of the plan features is enabled */}
      {supplementsEnabled || dietPlanEnabled ? (
        <Button
          onClick={sndPlanExists ? handleViewSnDPlan : handleSnDPlanRequest}
          disabled={
            isActionLoading || (!supplementsEnabled && !dietPlanEnabled)
          } // Disable during action loading
          className="bg-yellow-600 hover:bg-yellow-700 text-white w-64 flex items-center justify-center gap-2 relative overflow-hidden"
        >
          {/* Progress Bar */}
          {isActionLoading && !sndPlanExists && (
            <div
              className="absolute left-0 top-0 h-full bg-yellow-800 transition-all duration-200"
              style={{ width: `${generateProgress}%` }}
            />
          )}
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isActionLoading ? ( // Check action loading state
              <>
                <span className="animate-spin">&#9696;</span>
                <span>
                  {sndPlanExists // Check existence prop
                    ? "Loading..."
                    : `${
                        retryCount > 0 ? "Retrying... " : "Generating... "
                      }${Math.round(generateProgress)}%`}
                </span>
              </>
            ) : sndPlanExists ? ( // Check existence prop
              <>
                <Eye className="h-4 w-4" />
                <span>
                  {supplementsEnabled && dietPlanEnabled
                    ? "Supplements & Diet Plan"
                    : supplementsEnabled
                    ? "Supplements"
                    : dietPlanEnabled
                    ? "Diet Plan"
                    : "No Plan Available"}
                </span>
              </>
            ) : (
              <span>
                {supplementsEnabled && dietPlanEnabled
                  ? "Suggest Supplements & Diet Plan"
                  : supplementsEnabled
                  ? "Suggest Supplements"
                  : dietPlanEnabled
                  ? "Suggest Diet Plan"
                  : "No Plan Available"}
              </span>
            )}
          </span>
        </Button>
      ) : null}

      {/* Credits info / free info */}
      {supplementsEnabled || dietPlanEnabled ? (
        !sndPlanExists ? ( // Check existence prop
          <p className="text-sm text-gray-600 text-center mt-2">
            (100 credits)
          </p>
        ) : (
          <p className="text-sm text-gray-600 text-center mt-2">(Free)</p>
        )
      ) : null}

      {/* Only render the DietInstructionsDialog if diet plan is enabled */}
      {dietPlanEnabled && (
        <Suspense fallback={null}>
          <DietInstructionsDialog
            isOpen={showDietDialog}
            onClose={() => setShowDietDialog(false)}
            onProceed={handleProceedWithPlan}
          />
        </Suspense>
      )}
    </div>
  );
}
