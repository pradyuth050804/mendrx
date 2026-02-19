// src/components/RenewSubscriptionDialog.tsx
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PricingOptions from "./PricingOptions";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface RenewSubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

const RenewSubscriptionDialog: React.FC<RenewSubscriptionDialogProps> = ({
  isOpen,
  onClose,
  userEmail,
}) => {
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuth();

  const validatePhone = (phoneNumber: string) => {
    // Basic validation - Adjust regex for Indian phone numbers
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  };

  // In RenewSubscriptionDialog.tsx
  const handleSubmit = async () => {
    if (!validatePhone(phone)) {
      setPhoneError(
        "Please enter a valid 10-digit phone number starting with 6-9"
      );
      return;
    }

    setPhoneError("");
    setIsSubmitting(true);

    try {
      // Get the current auth token from the session
      const token = session?.access_token;

      if (!token) {
        toast.error("Authentication error. Please try logging in again.");
        return;
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/lead/free-trial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Added the token
        },
        body: JSON.stringify({
          email: userEmail,
          phone: phone,
          // Include any other fields required by FreeTrailRequestModel
        }),
      });

      if (response.ok) {
        setShowThankYou(true);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting contact info:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlanSelect = (plan: string, period: string) => {
    // Redirect to checkout or subscription page
    //router.push(`/subscription?plan=${plan}&period=${period}`);
    toast.success(
      "Apply for free credits, and our team will reach out to you soon!"
    );
  };

  const handleClose = () => {
    setShowThankYou(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        {!showThankYou ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                Choose your Plan
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Select a pricing plan to continue using MendRx or request free
                trial credits below.
              </DialogDescription>
            </DialogHeader>

            <div className="py-0">
              <PricingOptions onSelectPlan={handlePlanSelect} compact={true} />
            </div>

            <div className="mt-2 border-t pt-2">
              <h3 className="text-lg font-semibold mb-2 text-center text-green-600">
                New to MendRx? Please provide your contact info for free trial
                credits!
              </h3>
              <div className="space-y-4 max-w-md mx-auto">
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className={phoneError ? "border-red-500" : ""}
                  />
                  {phoneError && (
                    <p className="text-red-500 text-sm">{phoneError}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Request Free Credits"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-green-600">
                Thank You!
              </DialogTitle>
              <DialogDescription className="text-lg">
                We've received your request for free trial credits. Our
                representative will reach out to you soon to help you get
                started with MendRx.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center my-6">
              <div className="bg-green-100 text-green-700 p-4 rounded-lg text-center w-full max-w-md">
                <p className="font-medium">
                  Your information has been submitted successfully!
                </p>
                <p className="text-sm mt-2">
                  We typically respond within 2 business hours.
                </p>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                onClick={handleClose}
                className="bg-green-600 hover:bg-green-700"
              >
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Helper function to get API URL
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

export default RenewSubscriptionDialog;
