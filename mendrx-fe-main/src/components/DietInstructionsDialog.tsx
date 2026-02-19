import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const MEAL_TYPES = [
  {
    id: "pre_morning",
    label: "Pre-morning",
    description: "Herbal teas/detox drinks"
  },
  {
    id: "morning",
    label: "Morning",
    description: "Breakfast"
  },
  {
    id: "mid_morning",
    label: "Mid-morning",
    description: "Snacks"
  },
  {
    id: "lunch",
    label: "Lunch",
    description: "Main meal"
  },
  {
    id: "early_evening",
    label: "Early evening",
    description: "Light snacks/teas"
  },
  {
    id: "night",
    label: "Night",
    description: "Dinner"
  },
  {
    id: "bedtime",
    label: "Bedtime",
    description: "Relaxing teas"
  }
] as const;


interface DietInstructionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: (
    isSingleDayPlan: boolean,
    includeCalorieBreakdown: boolean,
    includeFoodMeasurements: boolean,
    maxCaloriesPerDay: number | null,
    foodInclusions: string,
    foodExclusions: string,
    preferredCuisines: string,
    selectedMealTypes: string[]
  ) => void;
}

const DietInstructionsDialog: React.FC<DietInstructionsDialogProps> = ({
  isOpen,
  onClose,
  onProceed,
}) => {
  const [planType, setPlanType] = useState<"consolidated" | "weekly">(
    "consolidated"
  );
  const [includeCalorieBreakdown, setIncludeCalorieBreakdown] = useState(false);
  const [includeFoodMeasurements, setIncludeFoodMeasurements] = useState(false);
  const [maxCaloriesPerDay, setMaxCaloriesPerDay] = useState<string>("");
  const [foodInclusions, setFoodInclusions] = useState("");
  const [foodExclusions, setFoodExclusions] = useState("");
  const [preferredCuisines, setPreferredCuisines] = useState("");
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>(["morning", "lunch", "night"]);
  const [mealSelectionError, setMealSelectionError] = useState("");

  const isSingleDayPlan = planType === "consolidated";

  const handleProceed = () => {
    setMealSelectionError("");
    
    if (selectedMealTypes.length === 0) {
      setMealSelectionError("Please select at least one meal type");
      return;
    }
    
    onProceed(
      isSingleDayPlan,
      includeCalorieBreakdown,
      includeFoodMeasurements,
      maxCaloriesPerDay ? parseInt(maxCaloriesPerDay) : null,
      foodInclusions,
      foodExclusions,
      preferredCuisines,
      selectedMealTypes
    );
  };

  const handleMealTypeChange = (mealId: string, checked: boolean) => {
    setMealSelectionError("");
    if (checked) {
      setSelectedMealTypes(prev => [...prev, mealId]);
    } else {
      setSelectedMealTypes(prev => prev.filter(id => id !== mealId));
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-6">
          <DialogTitle className="text-xl font-semibold">
            Client Diet Plan Configuration
          </DialogTitle>
          <DialogDescription className="text-base">
            Configure the parameters for your client's personalized nutrition
            plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4 overflow-y-auto flex-1">
          {/* Plan Structure Section */}
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <Label className="text-base font-medium text-slate-900 block mb-4">
              Plan Structure
            </Label>
            <RadioGroup
              value={planType}
              onValueChange={(value: string) =>
                setPlanType(value as "consolidated" | "weekly")
              }
              className="grid grid-cols-2 gap-4"
            >
              <div
                className={`relative p-4 rounded-md border-2 transition-all cursor-pointer ${
                  planType === "consolidated"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-white hover:border-blue-300"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value="consolidated"
                    id="consolidated"
                    className="mt-1"
                  />
                  <div>
                    <Label
                      htmlFor="consolidated"
                      className="font-medium cursor-pointer text-sm"
                    >
                      Consolidated Plan
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Single-day template with meal variety recommendations
                    </p>
                  </div>
                </div>
              </div>
              <div
                className={`relative p-4 rounded-md border-2 transition-all cursor-pointer ${
                  planType === "weekly"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-white hover:border-blue-300"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="weekly" id="weekly" className="mt-1" />
                  <div>
                    <Label
                      htmlFor="weekly"
                      className="font-medium cursor-pointer text-sm"
                    >
                      7-Day Protocol
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Structured weekly meal plan with daily variations
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Meal Selection Section */}
          <div className="bg-teal-50 p-6 rounded-lg border border-teal-200">
            <Label className="text-base font-medium text-slate-900 block mb-4">
              Meal Selection
            </Label>
            <p className="text-sm text-gray-600 mb-4">
              Choose which meals to include in the diet plan.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {MEAL_TYPES.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center space-x-3 p-3 rounded-md bg-white border border-teal-100"
                >
                  <Checkbox
                    id={meal.id}
                    checked={selectedMealTypes.includes(meal.id)}
                    onCheckedChange={(checked) =>
                      handleMealTypeChange(meal.id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={meal.id}
                      className="font-medium cursor-pointer text-sm text-slate-800"
                    >
                      {meal.label}
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">{meal.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Selection Summary */}
            <div className="p-3 bg-white rounded-md border border-teal-100 mb-2">
              <div className="text-sm text-slate-700">
                <span className="font-medium">Selected:</span>{" "}
                {selectedMealTypes.length > 0 ? (
                  <span className="text-teal-600">
                    {selectedMealTypes.map(id => 
                      MEAL_TYPES.find(m => m.id === id)?.label
                    ).join(", ")}
                  </span>
                ) : (
                  <span className="text-gray-500">No meals selected</span>
                )}
              </div>
            </div>
            
            {/* Error Message */}
            {mealSelectionError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {mealSelectionError}
              </div>
            )}
          </div>

          {/* Nutritional Analysis Options */}
          <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-200">
            <Label className="text-base font-medium text-slate-900 block mb-4">
              Nutritional Analysis & Measurements
            </Label>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center space-x-3 p-3 rounded-md bg-white border border-emerald-100">
                <Checkbox
                  id="includeCalorieBreakdown"
                  checked={includeCalorieBreakdown}
                  onCheckedChange={(checked) =>
                    setIncludeCalorieBreakdown(checked as boolean)
                  }
                />
                <Label
                  htmlFor="includeCalorieBreakdown"
                  className="font-medium cursor-pointer text-sm"
                >
                  Include calorie breakdown with macronutrient and micronutrient
                  distribution
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-md bg-white border border-emerald-100">
                <Checkbox
                  id="includeFoodMeasurements"
                  checked={includeFoodMeasurements}
                  onCheckedChange={(checked) =>
                    setIncludeFoodMeasurements(checked as boolean)
                  }
                />
                <Label
                  htmlFor="includeFoodMeasurements"
                  className="font-medium cursor-pointer text-sm"
                >
                  Include precise portion measurements and serving sizes
                </Label>
              </div>
            </div>

            <div className="mt-4">
              <Label
                htmlFor="maxCaloriesPerDay"
                className="text-sm font-medium text-slate-700 block mb-2"
              >
                Daily caloric target (optional)
              </Label>
              <Input
                id="maxCaloriesPerDay"
                type="number"
                value={maxCaloriesPerDay}
                onChange={(e) => setMaxCaloriesPerDay(e.target.value)}
                placeholder="Enter target calories per day"
                className="border-emerald-200 focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Therapeutic Food Guidelines */}
          <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
            <Label className="text-base font-medium text-slate-900 block mb-4">
              Therapeutic Food Guidelines
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-medium text-green-700 text-sm">
                  Therapeutic Inclusions
                </Label>
                <Textarea
                  value={foodInclusions}
                  onChange={(e) => setFoodInclusions(e.target.value)}
                  placeholder="Specify foods, ingredients, or nutrients that support the client's therapeutic goals (e.g., anti-inflammatory foods, prebiotics, specific micronutrients)"
                  className="min-h-[100px] border-green-200 focus:border-green-400 bg-white text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium text-red-700 text-sm">
                  Clinical Restrictions
                </Label>
                <Textarea
                  value={foodExclusions}
                  onChange={(e) => setFoodExclusions(e.target.value)}
                  placeholder="List foods, ingredients, or allergens to avoid based on client's health conditions, sensitivities, or contraindications"
                  className="min-h-[100px] border-red-200 focus:border-red-400 bg-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Cultural & Dietary Preferences */}
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <Label className="text-base font-medium text-slate-900 block mb-2">
              Cultural & Dietary Preferences
            </Label>
            <Label className="text-xs text-slate-600 block mb-3">
              Consider client's cultural background and food preferences for
              better compliance
            </Label>
            <Textarea
              value={preferredCuisines}
              onChange={(e) => setPreferredCuisines(e.target.value)}
              placeholder="Specify preferred cuisine types, cooking methods, or cultural dietary patterns (e.g., Mediterranean, Traditional Chinese Medicine, Ayurvedic, Plant-based)"
              className="min-h-[80px] border-purple-200 focus:border-purple-400 bg-white text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 mt-6 pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="px-6">
            Cancel
          </Button>
          <Button
            onClick={handleProceed}
            className="px-8 bg-blue-600 hover:bg-blue-700"
          >
            Generate Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DietInstructionsDialog;
