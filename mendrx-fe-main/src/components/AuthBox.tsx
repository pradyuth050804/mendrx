// File: src/components/AuthBox.tsx

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { createAuthClient, AuthClient } from "@/lib/supabase-auth";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/api";
import { createContext, useContext } from "react";
import { useUserData } from "@/contexts/UserContext";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

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

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
}

interface UserContextType {
  userData: UserData | null;
  updateUserData: (data: UserData) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);

  const updateUserData = (data: UserData) => {
    setUserData(data);
  };

  return (
    <UserContext.Provider value={{ userData, updateUserData }}>
      {children}
    </UserContext.Provider>
  );
}

const AuthBoxContent: React.FC = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const authClient: AuthClient = createAuthClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { updateUserData } = useUserData();
  const { session, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (searchParams.get("authError") === "true") {
      setAuthError(
        "An error occurred during authentication. Please try again."
      );
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && session) {
      if (searchParams.get("authError") === "true") {
        setAuthError(
          "An error occurred during authentication. Please try again."
        );
      } else {
        router.push("/dashboard");
      }
    }
  }, [session, authLoading, router, searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, resendTimer]);

  const handleUserAuthentication = async (token: string) => {
    try {
      // First, try to fetch existing user data
      try {
        console.log("user API call 2");
        const response = await fetchWithAuth("/user", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const userData = await response.json();
        if (userData.success) {
          updateUserData(userData.data);
        }
        router.push("/dashboard?message=welcome_back");
      } catch (error) {
        if (error instanceof Error && error.message.includes("404")) {
          // User not found, proceed with registration

          try {
            const apiUrl = getApiUrl();
            if (!apiUrl) {
              throw new Error("API URL is not defined");
            }
            const response = await fetch(`${apiUrl}/register`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                email: email,
              }),
            });
            const responseData: ApiResponse<UserData> = await response.json();
            if (responseData.success) {
              updateUserData(responseData.data);
              router.push(
                `/dashboard?message=registration_successful&credits=${responseData.data.credits}`
              );
            } else {
              throw new Error(responseData.message || "Registration failed");
            }
          } catch (error) {
            setAuthError("Registration failed. Please try again.");
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Error during user authentication:", error);
      setAuthError("Authentication failed. Please try again.");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    try {
      const { error } = await authClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (error) throw error;
      setOtpSent(true);
      setResendTimer(60);
    } catch (error) {
      console.error("Error sending authentication OTP:", error);
      setAuthError("Error sending authentication OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await authClient.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      if (data.session) {
        await handleUserAuthentication(data.session.access_token);
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setAuthError("Incorrect OTP or authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      const { error } = await authClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (error) throw error;
      setResendTimer(60);
    } catch (error) {
      console.error("Error resending authentication OTP:", error);
      setAuthError("Error resending authentication OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const { error } = await authClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      // The auth/callback/route.ts will handle the rest
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setAuthError("Error signing in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-sm w-full animate-[fadeIn_0.5s_ease-out] transition-all">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Sign In / Sign Up
      </h2>
      {authError && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded w-full max-w-[240px] mx-auto text-center text-xs">
          {authError}
        </div>
      )}
      <form
        onSubmit={otpSent ? handleOtpVerification : handleEmailAuth}
        className="mb-6 flex flex-col items-center"
      >
        {!otpSent ? (
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full max-w-[240px] p-2 mb-4 border rounded text-gray-700"
            required
          />
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full max-w-[240px] p-2 mb-2 border rounded text-gray-700"
              required
            />
            <p className="text-sm text-gray-600 mb-4 w-full max-w-[240px] text-center">
              OTP sent to {email}. Please check your email.
            </p>
            {resendTimer > 0 ? (
              <p className="text-xs text-gray-500 mb-2 w-full max-w-[240px] text-center">
                Resend OTP in {resendTimer} seconds
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-xs text-blue-600 mb-2 hover:underline w-full max-w-[240px] text-center"
              >
                Resend OTP
              </button>
            )}
          </>
        )}
        <button
          type="submit"
          className="w-full max-w-[240px] bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : otpSent ? "Verify OTP" : "Continue"}
        </button>
      </form>
      <div className="relative mb-6 w-full max-w-[240px] mx-auto">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or</span>
        </div>
      </div>
      <div className="flex justify-center">
        <button
          onClick={handleGoogleAuth}
          className="gsi-material-button w-full max-w-[240px]"
          disabled={isLoading}
        >
          <div className="gsi-material-button-state"></div>
          <div className="gsi-material-button-content-wrapper">
            <div className="gsi-material-button-icon">
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                style={{ display: "block" }}
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                ></path>
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                ></path>
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                ></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            </div>
            <span className="gsi-material-button-contents">
              Continue with Google
            </span>
          </div>
        </button>
      </div>
      <p className="text-xs text-center mt-4 text-gray-600 w-full max-w-[260px] mx-auto">
        If you already have an account, we'll log you in.
      </p>
      {/* Add this just before the submit button in the form */}
      <p className="text-xs text-center mt-4 text-gray-600 w-full max-w-[260px] mx-auto">
        By continuing, you agree to our{" "}
        <Link
          href="/terms-and-conditions"
          className="text-green-600 hover:underline"
        >
          Terms & Conditions
        </Link>{" "}
        and{" "}
        <Link href="/privacy-policy" className="text-green-600 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
};

const AuthBox: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthBoxContent />
    </Suspense>
  );
};

export default AuthBox;
