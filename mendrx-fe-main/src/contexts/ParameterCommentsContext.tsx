// src/contexts/ParameterCommentsContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getApiUrl } from "@/utils/api";
import { createAuthClient } from "@/lib/supabase-auth";

interface ParameterComments {
  lowParameterComments: Record<string, string>;
  highParameterComments: Record<string, string>;
}

interface ParameterCommentsContextType {
  parameterComments: ParameterComments | null;
  isLoading: boolean;
  error: string | null;
  fetchParameterComments: () => Promise<void>;
}

const ParameterCommentsContext = createContext<ParameterCommentsContextType>({
  parameterComments: null,
  isLoading: false,
  error: null,
  fetchParameterComments: async () => {
    throw new Error(
      "useParameterComments must be used within a ParameterCommentsProvider"
    );
  },
});

export const ParameterCommentsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [parameterComments, setParameterComments] =
    useState<ParameterComments | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const authClient = createAuthClient();

  const fetchParameterComments = async (force = false) => {
    // Skip if already initialized and not forcing a refresh
    if (initialized && !force) {
      return;
    }

    try {
      // Get current session
      const {
        data: { session },
      } = await authClient.auth.getSession();

      // Only proceed if we have a valid session
      if (!session?.access_token) {
        return;
      }

      setIsLoading(true);
      setError(null);

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/parameter-comments`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch parameter comments");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch parameter comments");
      }

      setParameterComments(result.data);
      setInitialized(true);
    } catch (err) {
      setError("Failed to load parameter comments");
      console.error("Error fetching parameter comments:", err);
      // Reset initialized state on error to allow retry
      setInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for sign out to clear data
  useEffect(() => {
    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setParameterComments(null);
        setInitialized(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [authClient.auth]);

  // Initial fetch when provider mounts
  useEffect(() => {
    fetchParameterComments();
  }, []);

  return (
    <ParameterCommentsContext.Provider
      value={{ parameterComments, isLoading, error, fetchParameterComments }}
    >
      {children}
    </ParameterCommentsContext.Provider>
  );
};

export const useParameterComments = () => useContext(ParameterCommentsContext);
