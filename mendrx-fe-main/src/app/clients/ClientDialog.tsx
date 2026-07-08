// File: src/app/clients/ClientDialog.tsx
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import MonthYearSelector from "./MonthYearSelector";
import CreateRCADialog from "@/components/CreateRCADialog";

interface ClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: any;
  isFirstClient?: boolean;
  skipRCADialog?: boolean;
}

interface FormErrors {
  name?: string;
  phoneNumber?: string;
  birthMonth?: string;
  age?: string;
  email?: string;
  gender?: string;
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

const ClientDialog: React.FC<ClientDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  client,
  isFirstClient,
  skipRCADialog = false,
}) => {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [useAge, setUseAge] = useState(false);
  const [age, setAge] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRCADialog, setShowRCADialog] = useState(false);
  const [newClientData, setNewClientData] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  const authClient = createAuthClient();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setIsAuthChecked(true);
    };
    checkAuth();
  }, [authClient.auth, router]);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setPhoneNumber(client.phoneNumber);
      setBirthMonth(client.birthMonth);
      setEmail(client.email || "");
      setGender(client.gender || "");
    }
  }, [client]);

  // Move the early return after all hooks are defined
  if (!isAuthChecked) {
    return null;
  }

  const validateField = (name: string, value: string) => {
    let error = "";
    if (!value.trim()) {
      error = `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }

    if (name === "phoneNumber") {
      const digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length !== 10) {
        error = "Phone number must be 10 digits";
      }
    }

    if (name === "email") {
      const emailValue = value.trim();
      if (!emailValue) {
        error = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        error = "Invalid email format";
      }
    }

    if (name === "gender" && !value.trim()) {
      error = "Gender is required";
    }

    setFormErrors((prev) => ({ ...prev, [name.toLowerCase()]: error }));
    return error;
  };

  const calculateBirthMonth = (age: number) => {
    const today = new Date();
    const birthYear = today.getFullYear() - age;
    const currentMonth = today.getMonth() + 1;
    return `${birthYear}-${currentMonth.toString().padStart(2, "0")}`;
  };

  const getDuplicateClientMessage = (error: any) => {
    if (error?.errorCode === "DUPLICATE_EMAIL") {
      return "A client with this email already exists.";
    }
    if (error?.errorCode === "DUPLICATE_CLIENT") {
      return "A client with the same name, phone number, and gender already exists.";
    }
    return "An error occurred. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameError = validateField("name", name);
    const genderError = validateField("gender", gender);
    const birthMonthError = useAge
      ? validateField("age", age)
      : validateField("birthMonth", birthMonth);
    const emailError = validateField("email", email);

    // Skip phone number validation if not provided
    const phoneError = phoneNumber
      ? validateField("phoneNumber", phoneNumber)
      : "";

    if (
      nameError ||
      phoneError ||
      genderError ||
      birthMonthError ||
      emailError
    ) {
      const errors = [
        nameError,
        phoneError,
        genderError,
        birthMonthError,
        emailError,
      ]
        .filter((error) => error)
        .join(", ");

      toast.error(errors);
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      const calculatedBirthMonth = useAge
        ? calculateBirthMonth(parseInt(age))
        : birthMonth;

      const apiUrl = getApiUrl();
      const response = await fetch(
        `${apiUrl}/clients${client ? `/${client.id}` : ""}`,
        {
          method: client ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            phoneNumber: phoneNumber.trim() || "0000000000", // Use default value if not provided
            birthMonth: calculatedBirthMonth,
            email: email.trim().toLowerCase(),
            gender: gender.trim(),
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        if (skipRCADialog) {
          // Skip RCA dialog and just call onSuccess
          onSuccess();
        } else {
          // Show RCA dialog as before
          setNewClientData(result.data);
          setShowRCADialog(true);
        }
      } else {
        throw result;
      }

      onSuccess();
    } catch (error) {
      console.error("Error submitting client:", error);
      toast.error(getDuplicateClientMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRCA = () => {
    setShowRCADialog(false);
    const calculatedAge = calculateAge(newClientData.birthMonth);
    router.push(
      `/rca?clientId=${newClientData.id}&clientName=${encodeURIComponent(
        newClientData.name
      )}&age=${calculatedAge}&gender=${newClientData.gender}`
    );
  };

  const calculateAge = (birthMonth: string) => {
    const [year, month] = birthMonth.split("-").map(Number);
    const today = new Date();
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() - (month - 1);
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < 1)) {
      age--;
    }
    return age;
  };

  const handleMonthYearChange = (value: string) => {
    setBirthMonth(value);
    validateField("birthMonth", value);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isFirstClient
                ? "Onboard Your First Client"
                : client
                ? "Edit Client"
                : "Onboard New Client"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  validateField("name", e.target.value);
                }}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender *</label>
              <select
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  validateField("gender", e.target.value);
                }}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {formErrors.gender && (
                <p className="mt-1 text-sm text-red-500">{formErrors.gender}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">
                  Month and Year of Birth *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useAge}
                    onChange={(e) => {
                      setUseAge(e.target.checked);
                      setAge("");
                      setBirthMonth("");
                    }}
                    className="h-4 w-4"
                    id="useAgeCheckbox"
                  />
                  <label
                    htmlFor="useAgeCheckbox"
                    className="text-sm text-gray-600"
                  >
                    Enter Age Instead
                  </label>
                </div>
              </div>

              {useAge ? (
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Enter age in years"
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);
                      validateField("age", e.target.value);
                    }}
                    min="0"
                    max="150"
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                  {formErrors.age && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.age}
                    </p>
                  )}
                </div>
              ) : (
                <MonthYearSelector
                  value={birthMonth}
                  onChange={handleMonthYearChange}
                  maxDate={new Date()}
                  label=""
                  error={formErrors.birthMonth}
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  validateField("phoneNumber", e.target.value);
                }}
                maxLength={10}
                className="w-full px-3 py-2 border rounded-md"
              />
              {formErrors.phoneNumber && (
                <p className="mt-1 text-sm text-red-500">
                  {formErrors.phoneNumber}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  validateField("email", e.target.value);
                }}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : client ? (
                  "Update Client"
                ) : (
                  "Create Client"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <CreateRCADialog
        isOpen={showRCADialog}
        onClose={() => {
          setShowRCADialog(false);
          onSuccess();
        }}
        onConfirm={handleCreateRCA}
        clientName={newClientData?.name || ""}
      />
    </>
  );
};

export default ClientDialog;
