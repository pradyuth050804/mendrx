"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Utensils, Globe, Clock, Flame, Dumbbell, Sparkles, Info } from "lucide-react";
import { toast } from "react-hot-toast";
import { createAuthClient } from "@/lib/supabase-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = [
  { id: 1, title: "Primary Diet (Required)", description: "Select the primary foundation for your meal plan." },
  { id: 2, title: "Support Diets (Max 2)", description: "Enhance your primary diet with additional support." },
  { id: 3, title: "Therapeutic Modifiers", description: "Customize your plan with specific therapeutic adjustments." },
  { id: 4, title: "Nutrition Preferences", description: "Define your dietary framework and energy targets." },
  { id: 5, title: "Clinical Conditions (Optional)", description: "Identify factors for fine-tuning meal recommendations." },
  { id: 6, title: "Review", description: "Review and generate" }
];

const DIET_OPTIONS = [
  "Gut Healing Diet",
  "Elimination Diet",
  "Metabolism Balance Diet",
  "Anti-Inflammatory Diet",
  "Nutrient Repletion Diet",
  "Liver Support Diet",
  "Weight Gain Diet",
  "Fat Loss Diet",
  "Hormone Balance Diet"
];

const SUPPORT_OPTIONS = [
  "Nutrient Repletion",
  "Metabolic Balance",
  "Anti-inflammatory",
  "Gut Healing",
  "Hormone Support",
  "Liver Support"
];

const MODIFIERS = [
  {
    category: "Food Sensitivity",
    options: ["Dairy-Free", "Gluten-Free", "Soy-Free"]
  },
  {
    category: "Gut Specific",
    options: ["Low FODMAP", "Low Fiber (acute phase)", "High Fiber"]
  },
  {
    category: "Metabolic",
    options: ["Low Carb", "Moderate Carb", "High Protein"]
  },
  {
    category: "Lifestyle",
    options: ["Early Dinner (before 7 pm)", "Time Restricted Eating (12/12, 14/10, 16/8)"]
  },
  {
    category: "Inflammation",
    options: ["Anti-inflammatory emphasis"]
  }
];

const CLINICAL_OPTIONS = [
  "Diabetes",
  "Thyroid Disorder",
  "PCOS",
  "IBS",
  "Fatty Liver",
  "Anemia"
];

const EMPTY_FORM: Record<string, any> = {
  primaryDiet: "",
  supportDiets: [],
  modifiers: [],
  dietType: "Non-Vegetarian",
  cuisine: "Mixed Indian",
  mealFrequency: "3 meals",
  calorieStrategy: "Auto",
  proteinTarget: "Moderate (0.8 g/kg)",
  clinicalConditions: []
};

interface DietConfig {
  primaryDiet: string;
  supportDiets: string[];
  modifiers: string[];
  preferences: {
    dietType: string;
    cuisine: string;
    mealFrequency: string;
    calorieStrategy: string;
    proteinTarget: string;
  };
  conditions: string[];
}

interface NewDietPlanStepperProps {
  initialConfig?: DietConfig | null;
  dataAvailable?: boolean;
  isLoadingConfig?: boolean;
  configError?: string | null;
  onCreditsUpdate?: (newCredits: number) => void;
}

function configToFormData(config: DietConfig): Record<string, any> {
  return {
    primaryDiet: config.primaryDiet || "",
    supportDiets: config.supportDiets || [],
    modifiers: config.modifiers || [],
    dietType: config.preferences?.dietType || "Non-Vegetarian",
    cuisine: config.preferences?.cuisine || "Mixed Indian",
    mealFrequency: config.preferences?.mealFrequency || "3 meals",
    calorieStrategy: config.preferences?.calorieStrategy || "Auto",
    proteinTarget: config.preferences?.proteinTarget || "Moderate (0.8 g/kg)",
    clinicalConditions: config.conditions || []
  };
}

// Badge component for auto-filled fields
function AutoFilledBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full ml-2">
      <Sparkles className="w-3 h-3" />
      Auto-selected from blood report
    </span>
  );
}

export default function NewDietPlanStepper({ initialConfig = null, dataAvailable = false, isLoadingConfig = false, configError = null, onCreditsUpdate }: NewDietPlanStepperProps) {
  const router = useRouter();
  const authClient = createAuthClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [useAiRecommendations, setUseAiRecommendations] = useState(!!initialConfig);
  const [formData, setFormData] = useState<Record<string, any>>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const progressStartTime = useRef<number | null>(null);

  // Track which fields were auto-filled
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  };

  // Progress bar animation during generation
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isGenerating) {
      setGenerateProgress(0);
      progressStartTime.current = Date.now();
      intervalId = setInterval(() => {
        setGenerateProgress((prev) => {
          if (prev >= 98) return 98;
          return prev + 0.3;
        });
      }, 300);
    } else {
      setGenerateProgress(0);
      progressStartTime.current = null;
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isGenerating]);

  // Apply initial config when it arrives
  useEffect(() => {
    // Type guard: only accept parsed objects, reject raw strings
    if (initialConfig && typeof initialConfig === "object" && initialConfig.primaryDiet) {
      const mapped = configToFormData(initialConfig);
      setFormData(mapped);

      // Track which fields were auto-filled (non-empty/non-default)
      const filled = new Set<string>();
      if (mapped.primaryDiet) filled.add("primaryDiet");
      if (mapped.supportDiets.length > 0) filled.add("supportDiets");
      if (mapped.modifiers.length > 0) filled.add("modifiers");
      if (mapped.clinicalConditions.length > 0) filled.add("clinicalConditions");
      if (mapped.dietType !== EMPTY_FORM.dietType) filled.add("dietType");
      if (mapped.cuisine !== EMPTY_FORM.cuisine) filled.add("cuisine");
      if (mapped.mealFrequency !== EMPTY_FORM.mealFrequency) filled.add("mealFrequency");
      if (mapped.calorieStrategy !== EMPTY_FORM.calorieStrategy) filled.add("calorieStrategy");
      if (mapped.proteinTarget !== EMPTY_FORM.proteinTarget) filled.add("proteinTarget");
      setAutoFilledFields(filled);
      setUseAiRecommendations(true);
    }
  }, [initialConfig]);

  // Toggle handler
  const handleToggleAi = useCallback(() => {
    if (useAiRecommendations) {
      // Turning OFF → clear all fields
      setFormData({ ...EMPTY_FORM });
      setAutoFilledFields(new Set());
      setUseAiRecommendations(false);
    } else {
      // Turning ON → reapply mapping
      if (initialConfig && typeof initialConfig === "object" && initialConfig.primaryDiet) {
        const mapped = configToFormData(initialConfig);
        setFormData(mapped);
        const filled = new Set<string>();
        if (mapped.primaryDiet) filled.add("primaryDiet");
        if (mapped.supportDiets.length > 0) filled.add("supportDiets");
        if (mapped.modifiers.length > 0) filled.add("modifiers");
        if (mapped.clinicalConditions.length > 0) filled.add("clinicalConditions");
        setAutoFilledFields(filled);
      }
      setUseAiRecommendations(true);
    }
  }, [useAiRecommendations, initialConfig]);

  const handleNext = () => {
    if (currentStep === 1 && !formData.primaryDiet) {
      setErrors({ primaryDiet: "Please select a primary diet to proceed" });
      return;
    }
    setErrors({});
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  const handleGenerate = async () => {
    const reportId = sessionStorage.getItem("dietPlanReportId");
    if (!reportId) {
      toast.error("Report ID not found. Please go back and try again.");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await authClient.auth.getSession();
      if (!session) {
        toast.error("Authentication required. Please log in.");
        router.push("/");
        return;
      }

      const apiUrl = getApiUrl();
      const requestBody = {
        reportId,
        primaryDiet: formData.primaryDiet,
        supportDiets: formData.supportDiets || [],
        modifiers: formData.modifiers || [],
        clinicalConditions: formData.clinicalConditions || [],
        dietType: formData.dietType,
        cuisine: formData.cuisine,
        mealFrequency: formData.mealFrequency,
        calorieStrategy: formData.calorieStrategy,
        proteinTarget: formData.proteinTarget,
      };

      const response = await fetch(`${apiUrl}/diet-plan/generate-new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.errorCode === "INSUFFICIENT_CREDITS") {
          toast.error(result.message || "Insufficient credits.");
        } else if (result.errorCode === "DIET_PLAN_VERSIONS_EXHAUSTED") {
          toast.error(result.message || "Maximum diet plan versions reached.");
        } else if (result.errorCode === "SUBSCRIPTION_EXPIRED") {
          toast.error(result.message || "Subscription expired.");
        } else {
          throw new Error(result.message || "Failed to generate diet plan");
        }
        return;
      }

      // Success
      toast.success("Diet Plan generated successfully!");

      if (result.data?.updatedCredits !== undefined && onCreditsUpdate) {
        onCreditsUpdate(result.data.updatedCredits);
      }

      // Navigate to the S&D plan view page
      router.push(`/reports/${reportId}/snd-plan`);

    } catch (error: any) {
      console.error("Error generating diet plan:", error);
      toast.error(error.message || "Failed to generate diet plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateFormData = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Once user manually changes a field, remove auto-filled badge
    setAutoFilledFields((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center flex-wrap gap-1">
                <Label htmlFor="primaryDiet" className="text-gray-900 font-semibold">Primary Diet</Label>
                {autoFilledFields.has("primaryDiet") && <AutoFilledBadge />}
              </div>
              <div className="flex flex-wrap gap-2">
                {DIET_OPTIONS.map((option) => {
                  const isSelected = formData.primaryDiet === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateFormData("primaryDiet", option)}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium transition-all border
                        ${isSelected
                          ? "bg-green-50 border-green-600 text-green-700 shadow-sm"
                          : "bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700"}
                      `}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 italic mt-2">
                Auto-selected based on top dysfunction (editable)
              </p>
              {errors.primaryDiet && (
                <p className="text-sm text-red-500 mt-1">{errors.primaryDiet}</p>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center flex-wrap gap-1">
                <Label className="text-gray-900 font-semibold">Support Diets (Select up to 2)</Label>
                {autoFilledFields.has("supportDiets") && <AutoFilledBadge />}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUPPORT_OPTIONS.map((option) => {
                  const isPrimary = formData.primaryDiet?.toLowerCase().includes(option.toLowerCase());
                  const isSelected = formData.supportDiets?.includes(option);
                  const maxReached = formData.supportDiets?.length >= 2;
                  const isDisabled = isPrimary || (maxReached && !isSelected);

                  return (
                    <div
                      key={option}
                      onClick={() => {
                        if (isDisabled) return;
                        const current = formData.supportDiets || [];
                        if (isSelected) {
                          updateFormData("supportDiets", current.filter((i: string) => i !== option));
                        } else {
                          updateFormData("supportDiets", [...current, option]);
                        }
                      }}
                      className={`
                        flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer
                        ${isSelected ? "bg-green-50 border-green-500" : "bg-white border-gray-100 hover:border-green-200"}
                        ${isDisabled ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100" : ""}
                      `}
                    >
                      <span className={`text-sm font-medium ${isSelected ? "text-green-700" : "text-gray-700"}`}>
                        {option}
                        {isPrimary && <span className="ml-2 text-[10px] text-gray-400 font-normal">(Primary)</span>}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-green-600" />}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-green-600 font-medium bg-green-50 p-3 rounded-md border border-green-100">
                You can select up to 2 support diets
              </p>
            </div>
          </div>
        );
      case 3:
        const hasFodmapFiberConflict = formData.modifiers?.includes("Low FODMAP") && formData.modifiers?.includes("High Fiber");
        const hasCarbWeightConflict = formData.modifiers?.includes("Low Carb") && formData.primaryDiet === "Weight Gain Diet";

        return (
          <div className="space-y-8">
            <div className="flex items-center flex-wrap gap-1 -mt-2">
              {autoFilledFields.has("modifiers") && <AutoFilledBadge />}
            </div>
            {MODIFIERS.map((cat) => (
              <div key={cat.category} className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{cat.category}</h4>
                <div className="flex flex-wrap gap-2">
                  {cat.options.map((opt) => {
                    const isSelected = formData.modifiers?.includes(opt);
                    const isConflicting =
                      (opt === "Low FODMAP" && isSelected && hasFodmapFiberConflict) ||
                      (opt === "High Fiber" && isSelected && hasFodmapFiberConflict) ||
                      (opt === "Low Carb" && isSelected && hasCarbWeightConflict);

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const current = formData.modifiers || [];
                          if (isSelected) {
                            updateFormData("modifiers", current.filter((i: string) => i !== opt));
                          } else {
                            updateFormData("modifiers", [...current, opt]);
                          }
                        }}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-all border
                          ${isSelected
                            ? isConflicting
                              ? "bg-amber-100 border-amber-500 text-amber-800"
                              : "bg-green-600 border-green-600 text-white shadow-sm"
                            : "bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700"}
                        `}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {(hasFodmapFiberConflict || hasCarbWeightConflict) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-bold text-amber-800 flex items-center">
                  <span className="mr-2">⚠️</span> Potential Conflicts Detected:
                </p>
                {hasFodmapFiberConflict && (
                  <p className="text-sm text-amber-700">• Low FODMAP is generally not recommended with High Fiber diets during acute phases.</p>
                )}
                {hasCarbWeightConflict && (
                  <p className="text-sm text-amber-700">• Low Carb modifiers may conflict with the goal of a Weight Gain Diet.</p>
                )}
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="space-y-8">
            <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-6 space-y-8">
                {/* Diet Type */}
                <div className="space-y-3">
                  <Label className="flex items-center text-gray-900 font-semibold mb-2">
                    <Utensils className="w-4 h-4 mr-2 text-green-600" />
                    Diet Type
                    {autoFilledFields.has("dietType") && <AutoFilledBadge />}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {["Vegetarian", "Eggetarian", "Non-Vegetarian"].map(opt => {
                      const isSelected = formData.dietType === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateFormData("dietType", opt)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${isSelected ? "bg-green-600 border-green-600 text-white shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
                            }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cuisine */}
                <div className="space-y-3">
                  <Label className="flex items-center text-gray-900 font-semibold mb-2">
                    <Globe className="w-4 h-4 mr-2 text-green-600" />
                    Cuisine Preference
                    {autoFilledFields.has("cuisine") && <AutoFilledBadge />}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {["South Indian", "North Indian", "Mixed Indian", "Custom"].map(opt => {
                      const isSelected = formData.cuisine === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateFormData("cuisine", opt)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${isSelected ? "bg-green-600 border-green-600 text-white shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
                            }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Meal Frequency */}
                <div className="space-y-3">
                  <Label className="flex items-center text-gray-900 font-semibold mb-2">
                    <Clock className="w-4 h-4 mr-2 text-green-600" />
                    Meal Frequency
                    {autoFilledFields.has("mealFrequency") && <AutoFilledBadge />}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {["3 meals", "4 meals", "5 meals"].map(opt => {
                      const isSelected = formData.mealFrequency === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateFormData("mealFrequency", opt)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${isSelected ? "bg-green-600 border-green-600 text-white shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
                            }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Calorie Strategy */}
                <div className="space-y-3">
                  <Label className="flex items-center text-gray-900 font-semibold mb-2">
                    <Flame className="w-4 h-4 mr-2 text-green-600" />
                    Calorie Strategy
                    {autoFilledFields.has("calorieStrategy") && <AutoFilledBadge />}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {["Auto", "Mild Deficit", "Aggressive Deficit", "Maintenance", "Surplus (Weight Gain)"].map(opt => {
                      const isSelected = formData.calorieStrategy === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateFormData("calorieStrategy", opt)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${isSelected ? "bg-green-600 border-green-600 text-white shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
                            }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Protein Target */}
                <div className="space-y-3">
                  <Label className="flex items-center text-gray-900 font-semibold mb-2">
                    <Dumbbell className="w-4 h-4 mr-2 text-green-600" />
                    Protein Target
                    {autoFilledFields.has("proteinTarget") && <AutoFilledBadge />}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {["Low (0.6 g/kg)", "Moderate (0.8 g/kg)", "High (1–1.2 g/kg)"].map(opt => {
                      const isSelected = formData.proteinTarget === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateFormData("proteinTarget", opt)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${isSelected ? "bg-green-600 border-green-600 text-white shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
                            }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-1">
                  <Label className="text-gray-700">Clinical Conditions (Optional)</Label>
                  {autoFilledFields.has("clinicalConditions") && <AutoFilledBadge />}
                </div>
                <span className="text-xs text-gray-400 font-medium">No selection limit</span>
              </div>
              <p className="text-sm text-gray-500">
                Used to fine-tune meal recommendations
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CLINICAL_OPTIONS.map((option) => {
                const isSelected = formData.clinicalConditions?.includes(option);
                return (
                  <div
                    key={option}
                    onClick={() => {
                      const current = formData.clinicalConditions || [];
                      if (isSelected) {
                        updateFormData("clinicalConditions", current.filter((i: string) => i !== option));
                      } else {
                        updateFormData("clinicalConditions", [...current, option]);
                      }
                    }}
                    className={`
                      flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer
                      ${isSelected ? "bg-green-50 border-green-500" : "bg-white border-gray-100 hover:border-green-200"}
                    `}
                  >
                    <span className={`text-sm font-medium ${isSelected ? "text-green-700" : "text-gray-700"}`}>
                      {option}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Review Your Selections</h3>

            <div className="space-y-4">
              {/* Primary Diet Section */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Primary Diet</h4>
                <p className="text-green-700 font-semibold">{formData.primaryDiet || "None selected"}</p>
              </div>

              {/* Support Diets Section */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Support Diets</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.supportDiets?.length > 0 ? (
                    formData.supportDiets.map((diet: string) => (
                      <span key={diet} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-sm text-gray-700">
                        {diet}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400 italic">None selected</span>
                  )}
                </div>
              </div>

              {/* Therapeutic Modifiers Section */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Therapeutic Modifiers</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.modifiers?.length > 0 ? (
                    formData.modifiers.map((mod: string) => (
                      <span key={mod} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-sm text-gray-700">
                        {mod}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400 italic">None selected</span>
                  )}
                </div>
              </div>

              {/* Preferences Section */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Nutrition Preferences</h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-medium uppercase">Diet Type</p>
                    <p className="text-sm text-gray-700 font-medium">{formData.dietType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-medium uppercase">Cuisine</p>
                    <p className="text-sm text-gray-700 font-medium">{formData.cuisine}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-medium uppercase">Meal Frequency</p>
                    <p className="text-sm text-gray-700 font-medium">{formData.mealFrequency}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-medium uppercase">Calorie Strategy</p>
                    <p className="text-sm text-gray-700 font-medium">{formData.calorieStrategy}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-[10px] text-gray-400 font-medium uppercase">Protein Target</p>
                    <p className="text-sm text-gray-700 font-medium">{formData.proteinTarget}</p>
                  </div>
                </div>
              </div>

              {/* Clinical Conditions Section */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Clinical Conditions</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.clinicalConditions?.length > 0 ? (
                    formData.clinicalConditions.map((cond: string) => (
                      <span key={cond} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-sm text-gray-700">
                        {cond}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400 italic">No conditions specified</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const progressPercentage = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 w-full">
      <Card className="shadow-sm border-gray-200 rounded-lg overflow-hidden bg-white">

        {/* Progress header container */}
        <div className="bg-white px-6 py-8 border-b border-gray-100 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">New Diet Plan</h1>
              <p className="text-sm text-gray-500 mt-1">
                Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
              </p>
            </div>

            {/* Progress Bar (Integrated) */}
            <div className="w-full sm:w-48 h-2 bg-gray-100 rounded-full overflow-hidden self-end sm:self-center">
              <div
                className="h-full bg-green-600 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* AI Toggle */}
          {initialConfig && typeof initialConfig === "object" && initialConfig.primaryDiet && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3 mt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Use AI/Analysis Recommendations</span>
              </div>
              <button
                type="button"
                onClick={handleToggleAi}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${useAiRecommendations ? "bg-green-600" : "bg-gray-300"}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                    ${useAiRecommendations ? "translate-x-6" : "translate-x-1"}
                  `}
                />
              </button>
            </div>
          )}

          {/* No data warning */}
          {!dataAvailable && !initialConfig && !isLoadingConfig && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mt-2">
              <Info className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {configError || "Analysis data not available. Please fill in manually."}
              </span>
            </div>
          )}

          {/* Loading state */}
          {isLoadingConfig && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mt-2">
              <svg className="animate-spin h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-green-800">AI is analyzing your blood report...</span>
            </div>
          )}
        </div>

        <CardHeader className="pt-6 pb-2 px-6">
          <CardTitle className="text-xl text-gray-900">{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription className="text-gray-500">
            {STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>

        <CardContent className="py-6 px-6 min-h-[350px]">
          {renderStepContent()}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-gray-50 p-6 bg-gray-50/30">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isGenerating}
            className="rounded-md border-gray-200 text-gray-600 px-6 h-10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={isGenerating}
              className="rounded-md bg-green-600 hover:bg-green-700 text-white px-8 h-10 transition-colors"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="rounded-md bg-green-600 hover:bg-green-700 text-white px-8 h-10 shadow-sm transition-colors relative overflow-hidden"
            >
              {isGenerating && (
                <div
                  className="absolute left-0 top-0 h-full bg-green-800 transition-all duration-200"
                  style={{ width: `${generateProgress}%` }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {isGenerating ? (
                  <>
                    <span className="animate-spin">&#9776;</span>
                    <span>Generating... {Math.round(generateProgress)}%</span>
                  </>
                ) : (
                  <>
                    Generate Meal Plan
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </span>
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Steps Indicator Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`h-1.5 rounded-full transition-all ${currentStep === step.id ? "bg-green-600 w-8" :
              currentStep > step.id ? "bg-green-200 w-2" : "bg-gray-200 w-2"
              }`}
          />
        ))}
      </div>
    </div>
  );
}
