// File: src/app/rca/DashboardForm.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { LifeStyleHabitEnum } from "@/enums/lifeStyleHabitEnum";
import { ExistingConditionEnum } from "@/enums/existingConditionEnum";
import { ChevronDown, X } from "lucide-react";
import MultiFileUpload from "@/components/MultiFileUpload";
import { createAuthClient } from "@/lib/supabase-auth";
import { useRouter } from "next/navigation";
import debounce from "lodash/debounce";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FormErrors {
  clientId?: string;
  clientName?: string;
  gender?: string;
  age?: string;
  bloodTestReport?: string;
  reportDate?: string;
}

type EnumType = LifeStyleHabitEnum | ExistingConditionEnum;

interface MultiSelectProps<T extends EnumType> {
  label: string;
  options: { [key: string]: T };
  selected: T[];
  onChange: (selected: T[]) => void;
}

function MultiSelect<T extends EnumType>({
  label,
  options,
  selected,
  onChange,
}: MultiSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative mb-4" ref={dropdownRef}>
      <label className="block text-gray-700 font-bold mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white border rounded-md text-gray-700 h-10 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
      >
        <span>{selected.length} selected</span>
        <ChevronDown
          className={`transform transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          size={20}
        />
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {Object.entries(options).map(([key, value]) => (
            <label
              key={key}
              className="flex items-center p-2 hover:bg-gray-100"
            >
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600"
                checked={selected.includes(value)}
                onChange={() => {
                  const updatedSelected = selected.includes(value)
                    ? selected.filter((item) => item !== value)
                    : [...selected, value];
                  onChange(updatedSelected);
                }}
              />
              <span className="ml-2 text-gray-700">{value}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

interface DashboardFormProps {
  clientId: string;
  setClientId: (value: string) => void;
  clientName: string;
  setClientName: (value: string) => void;
  gender: string;
  setGender: (value: string) => void;
  age: string;
  setAge: (value: string) => void;
  bloodTestReports: File[];
  reportDate: string;
  setReportDate: (value: string) => void;
  setBloodTestReports: (files: File[]) => void;
  height: string;
  setHeight: (value: string) => void;
  weight: string;
  setWeight: (value: string) => void;
  waist: string;
  setWaist: (value: string) => void;
  diet: string;
  setDiet: (value: string) => void;
  lifestyleHabits: LifeStyleHabitEnum[];
  setLifestyleHabits: (habits: LifeStyleHabitEnum[]) => void;
  existingConditions: ExistingConditionEnum[];
  setExistingConditions: (conditions: ExistingConditionEnum[]) => void;
  clientHistoryQuestionnaire: File | null;
  setClientHistoryQuestionnaire: (file: File | null) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  isSubmitDisabled: boolean;
  formErrors: FormErrors;
  validateField: (name: string, value: string) => void;
  fileError: string | null;
  getApiUrl: () => string | undefined;
  searchParams: URLSearchParams;
}

export default function DashboardForm({
  clientId,
  setClientId,
  clientName,
  setClientName,
  gender,
  setGender,
  age,
  setAge,
  bloodTestReports,
  setBloodTestReports,
  reportDate,
  setReportDate,
  height,
  setHeight,
  weight,
  setWeight,
  waist,
  setWaist,
  diet,
  setDiet,
  lifestyleHabits,
  setLifestyleHabits,
  existingConditions,
  setExistingConditions,
  clientHistoryQuestionnaire,
  setClientHistoryQuestionnaire,
  handleSubmit,
  isLoading,
  isSubmitDisabled,
  formErrors,
  validateField,
  fileError,
  getApiUrl,
  searchParams,
}: DashboardFormProps) {
  const authClient = createAuthClient();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [fileErrorLocal, setFileErrorLocal] = useState<string | null>(
    fileError
  );
  useEffect(() => {
    setFileErrorLocal(fileError);
  }, [fileError]);

  const progressStartTime = useRef<number | null>(null);
  const [clientHistoryError, setClientHistoryError] = useState<string | null>(
    null
  );

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isLoading) {
      setProgress(0); // Reset progress when loading starts
      progressStartTime.current = Date.now();

      // Calculate how often we need to update to reach 95% in 20 seconds
      // 95 steps / 20 seconds = 4.75% per second
      // We'll update every 200ms, so each step should be ~0.95%
      intervalId = setInterval(() => {
        setProgress((prev) => {
          const elapsedTime = Date.now() - (progressStartTime.current || 0);

          // If we've reached max progress and 5 seconds have passed
          if (prev >= 95 && elapsedTime > 5000) {
            // Reset progress and start time for retry
            progressStartTime.current = Date.now();
            setRetryCount((count) => count + 1);
            return 0;
          }

          if (prev >= 95) {
            return 95;
          }
          return prev + 0.22;
        });
      }, 450);
    } else {
      setProgress(0);
      setRetryCount(0);
      progressStartTime.current = null;
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoading]);

  const fetchSuggestions = async (searchTerm: string) => {
    try {
      setIsFetching(true);
      setShowSuggestions(false); // Hide suggestions while fetching

      const apiUrl = getApiUrl();
      if (!apiUrl) return;

      const {
        data: { session },
      } = await authClient.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      const response = await fetch(
        `${apiUrl}/reports/clients/suggest?query=${encodeURIComponent(
          searchTerm || ""
        )}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const result = await response.json();
      if (result.success) {
        setSuggestions(result.data);
        setShowSuggestions(true); // Show suggestions after fetching
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsFetching(false);
    }
  };

  // Update the dependency array for debouncedFetch
  const debouncedFetch = useCallback(
    debounce((searchTerm: string) => fetchSuggestions(searchTerm), 300),
    [getApiUrl]
  );
  const handleHabitChange = (habit: LifeStyleHabitEnum) => {
    if (lifestyleHabits.includes(habit)) {
      setLifestyleHabits(lifestyleHabits.filter((h) => h !== habit));
    } else {
      setLifestyleHabits([...lifestyleHabits, habit]);
    }
  };

  const handleConditionChange = (condition: ExistingConditionEnum) => {
    if (existingConditions.includes(condition)) {
      setExistingConditions(existingConditions.filter((c) => c !== condition));
    } else {
      setExistingConditions([...existingConditions, condition]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handlePDFUpload = (files: File[]) => {
    // Clear any previous errors
    setFileErrorLocal(null);

    // Check if any files were uploaded
    if (files.length === 0) {
      setFileErrorLocal("Please upload at least one blood test report");
    }

    setBloodTestReports(files);
  };

  const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15 MB in bytes
  const ACTUAL_MAX_TOTAL_SIZE = 26 * 1024 * 1024; // 26 MB in bytes

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <div className="mb-4 relative">
          <label
            htmlFor="clientName"
            className="block text-gray-700 font-bold mb-2"
          >
            Client Name
          </label>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <input
                  type="text"
                  id="clientName"
                  value={clientName}
                  disabled={!!clientName} // Change from !!searchParams.get("clientName")
                  className={`w-full px-3 py-2 border rounded-md text-gray-700 h-10 ${
                    !!clientName ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                  required
                />
              </TooltipTrigger>
              {!!clientName && (
                <TooltipContent side="top">
                  <p>
                    To change client name, please edit from the clients
                    dashboard
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mb-4 flex space-x-4">
          <div className="w-1/2">
            <label
              htmlFor="gender"
              className="block text-gray-700 font-bold mb-2"
            >
              Gender
            </label>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <select
                      id="gender"
                      value={gender}
                      disabled={!!gender}
                      className={`w-full px-3 py-2 border rounded-md text-gray-700 h-10 ${
                        !!gender ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </TooltipTrigger>
                {!!gender && (
                  <TooltipContent side="top">
                    <p>
                      To change gender, please edit from the clients dashboard
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="w-1/2">
            <label htmlFor="age" className="block text-gray-700 font-bold mb-2">
              Age
            </label>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <input
                    type="number"
                    id="age"
                    value={age}
                    disabled={!!age}
                    className={`w-full px-3 py-2 border rounded-md text-gray-700 h-10 ${
                      !!age ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                    required
                  />
                </TooltipTrigger>
                {!!age && (
                  <TooltipContent side="top">
                    <p>To change age, please edit from the clients dashboard</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="mb-4">
          <label
            htmlFor="bloodTestReport"
            className="block text-gray-700 font-bold mb-2"
          >
            Blood Test Report(s)
          </label>
          <MultiFileUpload
            files={bloodTestReports}
            setFiles={handlePDFUpload}
            error={fileErrorLocal}
            maxTotalSize={MAX_TOTAL_SIZE}
            actualMaxTotalSize={ACTUAL_MAX_TOTAL_SIZE}
          />
          {formErrors.bloodTestReport && (
            <p className="mt-1 text-red-500 text-sm">
              {formErrors.bloodTestReport}
            </p>
          )}
        </div>
        <div className="mb-4">
          <label
            htmlFor="reportDate"
            className="block text-gray-700 font-bold mb-2"
          >
            Report Date
          </label>
          <input
            type="date"
            id="reportDate"
            value={reportDate}
            onChange={(e) => {
              setReportDate(e.target.value);
              validateField("reportDate", e.target.value);
            }}
            className={`w-full px-3 py-2 border rounded-md text-gray-700 h-10 ${
              formErrors.reportDate ? "border-red-500" : ""
            }`}
            max={(() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              return tomorrow.toISOString().split("T")[0];
            })()}
            required
          />
          {formErrors.reportDate && (
            <p className="mt-1 text-red-500 text-sm">{formErrors.reportDate}</p>
          )}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-gray-600 mb-4">
          Additional Information (optional)
        </p>
        <div className="mb-4 flex space-x-4">
          <div className="w-1/2">
            <label
              htmlFor="height"
              className="block text-gray-700 font-bold mb-2"
            >
              Height (cm)
            </label>
            <input
              type="number"
              id="height"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-gray-700 h-10"
              step="1"
              min="0"
            />
          </div>
          <div className="w-1/2">
            <label
              htmlFor="weight"
              className="block text-gray-700 font-bold mb-2"
            >
              Weight (kg)
            </label>
            <input
              type="number"
              id="weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-gray-700 h-10"
              step="0.1"
              min="0"
            />
          </div>
        </div>
        <div className="mb-4 flex space-x-4">
          <div className="w-1/2">
            <label
              htmlFor="waist"
              className="block text-gray-700 font-bold mb-2"
            >
              Waist (in)
            </label>
            <input
              type="number"
              id="waist"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-gray-700 h-10"
              step="0.1"
              min="0"
            />
          </div>
          <div className="w-1/2">
            <label
              htmlFor="diet"
              className="block text-gray-700 font-bold mb-2"
            >
              Diet
            </label>
            <select
              id="diet"
              value={diet}
              onChange={(e) => setDiet(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-gray-700 h-10"
            >
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="eggitarian">Eggitarian</option>
              <option value="non_vegetarian">Non-Vegetarian</option>
            </select>
          </div>
        </div>

        <div className="mb-4 flex space-x-4">
          <div className="w-1/2">
            <MultiSelect<LifeStyleHabitEnum>
              label="Lifestyle Habits"
              options={LifeStyleHabitEnum}
              selected={lifestyleHabits}
              onChange={setLifestyleHabits}
            />
          </div>
          <div className="w-1/2">
            <MultiSelect<ExistingConditionEnum>
              label="Known Conditions"
              options={ExistingConditionEnum}
              selected={existingConditions}
              onChange={setExistingConditions}
            />
          </div>
        </div>
        {/* Client History Questionnaire upload section */}
        <div className="mb-4">
          <label
            htmlFor="clientHistoryQuestionnaire"
            className="block text-gray-700 font-bold mb-2"
          >
            Client History Questionnaire
          </label>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    // Validate file type
                    if (file.type !== "application/pdf") {
                      setClientHistoryError("Only PDF files are accepted");
                      return;
                    }

                    // Validate file size (3MB = 3 * 1024 * 1024 bytes)
                    if (file.size > 3 * 1024 * 1024) {
                      setClientHistoryError("File size exceeds 3MB limit");
                      return;
                    }

                    setClientHistoryQuestionnaire(file);
                    setClientHistoryError(null);
                  }
                  e.target.value = ""; // Reset input for future selections
                }}
                accept=".pdf"
                className="hidden"
                id="history-upload"
              />
              <label
                htmlFor="history-upload"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 h-10 px-4 py-2 cursor-pointer"
              >
                {clientHistoryQuestionnaire ? "Replace File" : "Add File"}
              </label>
              <div className="text-sm text-gray-500">
                {clientHistoryQuestionnaire
                  ? `Size: ${formatFileSize(
                      clientHistoryQuestionnaire.size
                    )} / 3 MB`
                  : "Max size: 3 MB"}
              </div>
            </div>

            {clientHistoryQuestionnaire && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium">
                    {clientHistoryQuestionnaire.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatFileSize(clientHistoryQuestionnaire.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClientHistoryQuestionnaire(null);
                    setClientHistoryError(null);
                  }}
                  className="text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100 p-1"
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {clientHistoryError && (
              <p className="text-sm text-red-500">{clientHistoryError}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Upload a PDF document containing the client's comprehensive health
              history and additional medical information.
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className={`w-full bg-blue-600 text-white p-2 rounded transition-colors relative overflow-hidden ${
          isSubmitDisabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-blue-700"
        }`}
        disabled={isLoading || isSubmitDisabled}
      >
        {isLoading && (
          <div
            className="absolute left-0 top-0 h-full bg-blue-800 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        )}
        <span className="relative z-10 flex items-center justify-center">
          {isLoading ? (
            <>
              <span className="animate-spin inline-block mr-2">&#9696;</span>
              <span>
                {retryCount > 0 ? "Retrying... " : "Processing... "}
                {Math.round(progress)}%
              </span>
            </>
          ) : (
            "Submit"
          )}
        </span>
      </button>
      <p className="mt-2 text-sm text-gray-600 text-center">
        100 credits are consumed per analysis.
      </p>
    </form>
  );
}
