"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import SnDPlanView from "@/components/SnDPlanView";
import { createAuthClient } from "@/lib/supabase-auth";
import type { ClientInfo } from "@/types/client-info";
import { calculateAgeAsOnReportDate } from "@/utils/dateUtils";
import { useUserData } from "@/contexts/UserContext";

export default function SnDPlanPage({ params }: { params: { id: string } }) {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const authClient = createAuthClient();
  const { userData } = useUserData();

  useEffect(() => {
    // Create an AbortController to handle cleanup
    const abortController = new AbortController();
    let isMounted = true;

    const fetchClientInfo = async () => {
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
          throw new Error("API URL not configured");
        }

        // Only proceed with the fetch if component is still mounted
        if (isMounted) {
          console.log("/reports/ API invoked 1");
          const response = await fetch(`${apiUrl}/reports/${params.id}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            signal: abortController.signal, // Add abort signal to fetch
          });

          if (!response.ok) {
            throw new Error("Failed to fetch report");
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || "Failed to fetch report");
          }

          // Only update state if component is still mounted
          if (isMounted) {
            const report = result.data;
            setClientInfo({
              clientId: report.client.id,
              clientName: report.client.name,
              gender: report.client.gender,
              age: calculateAgeAsOnReportDate(
                report.client.birthMonth,
                report.reportDate
              ),
              height: report.height,
              weight: report.weight,
              waist: report.waist,
              diet: report.diet,
              bmi: report.bmi,
              lifestyleHabits: report.lifestyleHabits,
              existingConditions: report.existingConditions,
            });
          }
        }
      } catch (error) {
        // Type guard to check if error is an instance of Error
        if (error instanceof Error) {
          // Only handle error if it's not an abort error and component is mounted
          if (error.name !== "AbortError" && isMounted) {
            console.error("Error fetching client info:", error);
            router.push("/reports");
          }
        } else {
          // Handle unexpected error types
          console.error("Unexpected error fetching client info:", error);
          router.push("/reports");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchClientInfo();

    // Cleanup function
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [params.id, router, authClient.auth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <SnDPlanView
        reportId={params.id}
        clientInfo={clientInfo!}
        supplementsEnabled={userData?.parentDTO?.supplementsEnabled || false}
        dietPlanEnabled={userData?.parentDTO?.dietPlanEnabled || false}
        dietVersioningEnabled={
          userData?.parentDTO?.dietVersioningEnabled || false
        }
        supplementsAutoPopulationEnabled={
          userData?.parentDTO?.supplementsAutoPopulationEnabled || false
        }
      />
    </div>
  );
}

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
