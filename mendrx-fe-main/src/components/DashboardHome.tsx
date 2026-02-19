// src/components/DashboardHome.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Users, FileText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import RenewSubscriptionDialog from "./RenewSubscriptionDialog";
import { useUserData } from "@/contexts/UserContext";
import { useAuth } from "@/hooks/useAuth";
import ClientDialog from "@/app/clients/ClientDialog";

// Interface for user data
interface UserData {
  email: string;
  type: string;
  credits: number;
  expiry: string;
  parent?: {
    rcaEnabled: boolean;
  };
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
}

interface ClientCheckResponse {
  exists: boolean;
  count?: number;
}

const DashboardHome = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { userData } = useUserData();
  const { session, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [showRenewSubscriptionDialog, setShowRenewSubscriptionDialog] =
    useState(false); // New state for renew subscription dialog
  const [hasClients, setHasClients] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState<string>("");
  const [showClientDialog, setShowClientDialog] = useState(false); // Add this line

  const checkClientsExist = async (token: string) => {
    try {
      const apiUrl = getApiUrl();
      if (!apiUrl) {
        throw new Error("API URL is not defined");
      }

      const response = await fetch(`${apiUrl}/clients/check`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to check clients");
      }

      const result: ApiResponse<ClientCheckResponse> = await response.json();
      setHasClients(result.data.exists);

      // Update tooltip message based on subscription and client status
      updateTooltipMessage(result.data.exists);

      return result.data.exists;
    } catch (error) {
      console.error("Error checking clients:", error);
      setHasClients(false);
      return false;
    }
  };

  // Function to update tooltip message based on various conditions
  const updateTooltipMessage = (clientsExist: boolean) => {
    if (!userData) return;

    const expiryDate = new Date(userData.expiry);
    const now = new Date();
    const isExpired = expiryDate < now;
    const hasNoCredits = userData.credits === 0;

    if (isExpired) {
      setTooltipMessage(
        "Your subscription has expired. Please renew to continue."
      );
    } else if (hasNoCredits) {
      setTooltipMessage(
        "You have run out of credits. Please purchase more to continue."
      );
    } else if (!clientsExist) {
      setTooltipMessage(
        "Please onboard a client first before performing Root Cause Analysis."
      );
    } else {
      setTooltipMessage("");
    }
  };

  // Show welcome toast on successful authentication
  const showWelcomeToast = React.useCallback(() => {
    const message = searchParams.get("message");
    const credits = searchParams.get("credits");
    if (message === "welcome_back") {
      toast.success("Welcome back!");
    } else if (message === "registration_successful") {
      toast.success(
        credits && credits !== "0"
          ? `Registration successful! You've been granted ${credits} free credits.`
          : "Registration successful!"
      );
    }
    // Remove the message and credits from the URL
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("message");
    newSearchParams.delete("credits");
    router.replace(`/dashboard?${newSearchParams.toString()}`, {
      scroll: false,
    });
  }, [searchParams, router]);

  useEffect(() => {
    const initializeDashboard = async () => {
      if (!authLoading && session && userData) {
        try {
          const hasClientsResult = await checkClientsExist(
            session.access_token
          );
          showWelcomeToast();

          // Check if user has zero credits to show free credit dialog
          if (userData.credits === 0) {
            setShowRenewSubscriptionDialog(true);
          }

          // Show client dialog if user has no clients
          if (!hasClientsResult) {
            setShowClientDialog(true);
          }
        } catch (error) {
          console.error("Error initializing dashboard:", error);
          router.push("/");
        } finally {
          setIsLoading(false);
        }
      } else if (!authLoading && !session) {
        router.push("/");
      }
    };

    initializeDashboard();
  }, [session, authLoading, userData, router, showWelcomeToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isRCAEnabled = () => {
    if (!userData) return false;

    const expiryDate = new Date(userData.expiry);
    const now = new Date();
    const isParentRCAEnabled = userData.parentDTO?.rcaEnabled ?? false;
    return (
      expiryDate > now &&
      userData.credits > 0 &&
      hasClients &&
      isParentRCAEnabled
    );
  };

  // Now let's update the cards array to be more dynamic
  const getCards = () => [
    {
      title: "Clients",
      description: hasClients
        ? "View and manage your client information"
        : "Get started by onboarding your first client",
      icon: Users,
      onClick: () => router.push(`/clients?hasClients=${hasClients}`),
      comingSoon: false,
      imageSrc: "/clients-dashboard.png",
    },
    {
      title: "Root Cause Analysis",
      description: userData?.parentDTO?.rcaEnabled ? (
        "Analyze blood test reports and get detailed insights"
      ) : (
        <>
          Analyze blood test reports and get detailed insights.
          <br />
          This feature is disabled for your parent academy.
        </>
      ),
      icon: FileText,
      onClick: isRCAEnabled() ? () => router.push("/rca") : undefined,
      disabled: !isRCAEnabled(),
      loading: isLoading,
      tooltip: tooltipMessage,
      imageSrc: "/rca-dashboard.png",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Dashboard</h1>
        <div className="grid md:grid-cols-2 gap-6">
          {getCards().map((card, index) => (
            <div key={index} className="relative group">
              <Card
                className={`
                  transition-shadow relative overflow-hidden
                  ${
                    card.disabled
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:shadow-lg cursor-pointer"
                  }
                  ${card.loading ? "pointer-events-none" : ""}
                `}
                onClick={card.onClick}
              >
                <CardHeader className="space-y-1 p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">{card.title}</CardTitle>
                    <card.icon className="h-6 w-6 text-gray-600" />
                  </div>
                  <CardDescription className="text-base">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                {card.imageSrc && (
                  <div className="px-6 pb-6">
                    <div className="rounded-lg overflow-hidden border border-gray-100 shadow-sm w-[300px] mx-auto">
                      <img
                        src={card.imageSrc}
                        alt={`${card.title} preview`}
                        className="w-full h-[300px] object-contain bg-gray-50"
                      />
                    </div>
                  </div>
                )}
                {card.loading && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </Card>
              {card.tooltip && card.disabled && (
                <div className="absolute hidden group-hover:block z-10 p-2 bg-gray-800 text-white text-sm rounded shadow-lg -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  {card.tooltip}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Renew Subscription Dialog for users with zero credits */}
      <RenewSubscriptionDialog
        isOpen={showRenewSubscriptionDialog}
        onClose={() => setShowRenewSubscriptionDialog(false)}
        userEmail={userData?.email}
      />

      {/* Client Dialog */}
      <ClientDialog
        isOpen={showClientDialog}
        onClose={() => setShowClientDialog(false)}
        onSuccess={() => {
          setShowClientDialog(false);
          checkClientsExist(session?.access_token || "");
        }}
        isFirstClient={true}
      />
    </div>
  );
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

export default DashboardHome;
