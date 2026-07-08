"use client";

import React, { useEffect, useState } from "react";
import NewDietPlanStepper from "@/components/diet-plan/NewDietPlanStepper";
import Header from "@/components/Header";
import { createAuthClient, AuthClient } from "@/lib/supabase-auth";

const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
};

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

export default function NewDietPlanPage() {
  const [initialConfig, setInitialConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataAvailable, setDataAvailable] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDietConfig = async () => {
      const reportId = sessionStorage.getItem("dietPlanReportId");
      if (!reportId) {
        setDataAvailable(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const authClient: AuthClient = createAuthClient();
        const { data: { session } } = await authClient.auth.getSession();
        if (!session) {
          setError("Authentication required");
          setIsLoading(false);
          return;
        }

        const apiUrl = getApiUrl();
        let configData = null;

        // Poll with retries — the config may still be generating async
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          if (cancelled) return;

          const response = await fetch(`${apiUrl}/diet-config/${reportId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${session.access_token}`,
            },
          });

          if (response.status === 202) {
            // Not ready yet — wait and retry
            if (attempt < MAX_RETRIES - 1) {
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
              continue;
            }
            // Max retries exhausted
            break;
          }

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const result = await response.json();
          if (result.success && result.data) {
            let parsed = result.data;
            if (typeof parsed === "string") {
              // Strip markdown code fences and json prefix
              parsed = parsed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
              parsed = parsed.replace(/^json\s+/i, "").trim();
              const jsonMatch = parsed.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
              } else {
                throw new Error("No valid JSON found in diet config");
              }
            }
            configData = parsed;
            break;
          }
        }

        if (cancelled) return;

        if (configData) {
          setInitialConfig(configData);
          setDataAvailable(true);
        } else {
          setError("AI recommendations are still being prepared. You can fill in manually or refresh.");
          setDataAvailable(false);
        }
      } catch (e: any) {
        if (cancelled) return;
        console.error("Failed to fetch diet config:", e);
        setError("Failed to load AI recommendations. You can fill in manually.");
        setDataAvailable(false);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchDietConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <NewDietPlanStepper
          initialConfig={initialConfig}
          dataAvailable={dataAvailable}
          isLoadingConfig={isLoading}
          configError={error}
        />
      </main>
    </div>
  );
}
