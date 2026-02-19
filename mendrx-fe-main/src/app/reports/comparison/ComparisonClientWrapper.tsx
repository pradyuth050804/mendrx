// File: src/app/reports/comparison/ComparisonClientWrapper.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ComparisonClient from "./ComparisonClient";
import { createAuthClient } from "@/lib/supabase-auth";
import MultiClientComparisonClient from "./MultiClientComparisonClient";
import Header from "@/components/Header";
import toast from "react-hot-toast";
import { ComparisonResponseModel } from "@/types/comparison";

interface Props {
  comparisonId: string;
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

const ComparisonClientWrapper: React.FC<Props> = ({ comparisonId }) => {
  const [data, setData] = useState<ComparisonResponseModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const authClient = createAuthClient();
  const [authToken, setAuthToken] = useState<string | null>(null);

  const isSingleClientComparison = (): boolean => {
    if (!data?.reports) return true;
    const firstClientId = data.reports[0].clientId;
    return data.reports.every((report) => report.clientId === firstClientId);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (session) {
        setAuthToken(session.access_token);
        await fetchComparisonData(session.access_token);
      } else {
        router.push("/");
      }
    };
    checkAuth();
  }, [authClient.auth, router]);

  const fetchComparisonData = async (token: string) => {
    try {
      const apiUrl = getApiUrl();
      if (!apiUrl) {
        throw new Error("API URL is not defined");
      }

      const response = await fetch(`${apiUrl}/reports/compare`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportIds: comparisonId.split(","),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message || "Failed to fetch comparison data");
      }
    } catch (error) {
      console.error("Error fetching comparison data:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      toast.error("Failed to fetch comparison data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      {data ? (
        isSingleClientComparison() ? (
          <ComparisonClient data={data} />
        ) : (
          <MultiClientComparisonClient data={data} />
        )
      ) : (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            No comparison data found
          </div>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800"
          >
            Go Back
          </button>
        </div>
      )}
    </div>
  );
};

export default ComparisonClientWrapper;
