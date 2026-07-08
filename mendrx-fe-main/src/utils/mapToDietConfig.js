export function mapToDietConfig({ bloodMarkers = {}, analysis = {} }) {
    const bm = bloodMarkers;
    const an = analysis;

    const getVal = (key) => {
        if (bm[key] !== undefined) return parseFloat(bm[key]);
        return null;
    };

    const isHigh = (key, threshold) => {
        const v = getVal(key);
        return v !== null && v > threshold;
    };

    const isLow = (key, threshold) => {
        const v = getVal(key);
        return v !== null && v < threshold;
    };

    // --- Derived flags ---
    const isUnderweight = an.bmiCategory === "Underweight";
    const isOverweight =
        an.bmiCategory === "Overweight" || an.bmiCategory === "Obese";

    const inflammationHigh =
        an.inflammation === "High" || isHigh("hsCRP", 3);

    const liverElevated =
        isHigh("ALT", 40) || isHigh("AST", 40) || isHigh("GGT", 55);

    const gutIssues = !!an.gutIssues;

    const metabolicAbnormal =
        isHigh("glucose", 100) || isHigh("HbA1c", 5.7) || isHigh("triglycerides", 150);

    const hasDeficiencies = !!an.deficiencies && an.deficiencies.length > 0;

    const glucoseHigh = isHigh("glucose", 100) || isHigh("HbA1c", 5.7);
    const tshAbnormal = isLow("TSH", 0.4) || isHigh("TSH", 4.0);
    const hemoglobinLow = isLow("hemoglobin", 12);
    const albuminLow = isLow("albumin", 3.5);

    const lactoseIntolerant =
        !!an.lactoseIntolerance || (an.sensitivities || []).includes("Lactose");
    const glutenSensitive =
        !!an.glutenSensitivity || (an.sensitivities || []).includes("Gluten");
    const ibsPresent =
        !!an.ibs || (an.conditions || []).includes("IBS");
    const severeGut = gutIssues && an.gutSeverity === "Severe";
    const acuteGutInflammation = !!an.acuteGutInflammation;
    const fiberDeficiency =
        (an.deficiencies || []).includes("Fiber");
    const proteinDeficiency =
        albuminLow || (an.deficiencies || []).includes("Protein");

    // ============================
    // PRIMARY DIET (priority-based)
    // ============================
    let primaryDiet;
    if (isUnderweight) {
        primaryDiet = "Weight Gain Diet";
    } else if (inflammationHigh) {
        primaryDiet = "Anti-Inflammatory Diet";
    } else if (liverElevated) {
        primaryDiet = "Liver Support Diet";
    } else if (gutIssues) {
        primaryDiet = "Gut Healing Diet";
    } else if (metabolicAbnormal) {
        primaryDiet = "Metabolism Balance Diet";
    } else {
        primaryDiet = "Nutrient Repletion Diet";
    }

    // ============================
    // SUPPORT DIETS (max 2, no dup with primary)
    // ============================
    const supportCandidates = [];
    if (hasDeficiencies) supportCandidates.push("Nutrient Repletion");
    if (gutIssues) supportCandidates.push("Gut Healing");
    if (inflammationHigh) supportCandidates.push("Anti-inflammatory");
    if (metabolicAbnormal) supportCandidates.push("Metabolic Balance");

    const primaryLower = primaryDiet.toLowerCase();
    const supportDiets = [];
    const seen = new Set();
    for (const s of supportCandidates) {
        if (supportDiets.length >= 2) break;
        const sLower = s.toLowerCase();
        if (primaryLower.includes(sLower) || sLower.includes(primaryLower.replace(" diet", ""))) continue;
        if (seen.has(sLower)) continue;
        seen.add(sLower);
        supportDiets.push(s);
    }

    // ============================
    // MODIFIERS
    // ============================
    const modifiers = [];
    if (lactoseIntolerant) modifiers.push("Dairy-Free");
    if (glutenSensitive) modifiers.push("Gluten-Free");
    if (ibsPresent || severeGut) modifiers.push("Low FODMAP");
    if (fiberDeficiency) modifiers.push("High Fiber");
    if (acuteGutInflammation) modifiers.push("Low Fiber (acute phase)");
    if (glucoseHigh) modifiers.push("Low Carb");
    if (proteinDeficiency) modifiers.push("High Protein");

    // Constraint: Low FODMAP + High Fiber → keep Low FODMAP
    if (modifiers.includes("Low FODMAP") && modifiers.includes("High Fiber")) {
        modifiers.splice(modifiers.indexOf("High Fiber"), 1);
    }

    // Constraint: Low Carb + Weight Gain → remove Low Carb
    if (primaryDiet === "Weight Gain Diet" && modifiers.includes("Low Carb")) {
        modifiers.splice(modifiers.indexOf("Low Carb"), 1);
    }

    // Constraint: BMI underweight → remove Low Carb
    if (isUnderweight && modifiers.includes("Low Carb")) {
        modifiers.splice(modifiers.indexOf("Low Carb"), 1);
    }

    // ============================
    // CONDITIONS
    // ============================
    const conditions = [];
    if (glucoseHigh) conditions.push("Diabetes");
    if (tshAbnormal) conditions.push("Thyroid Disorder");
    if (ibsPresent) conditions.push("IBS");
    if (liverElevated) conditions.push("Fatty Liver");
    if (hemoglobinLow) conditions.push("Anemia");

    // ============================
    // PREFERENCES
    // ============================
    const preferences = {
        dietType: "Vegetarian",
        cuisine: "Mixed Indian",
        mealFrequency: isUnderweight ? "5 meals" : "4 meals",
        calorieStrategy: isUnderweight
            ? "Surplus (Weight Gain)"
            : isOverweight
                ? "Mild Deficit"
                : "Auto",
        proteinTarget: proteinDeficiency
            ? "High (1–1.2 g/kg)"
            : "Moderate (0.8 g/kg)",
    };

    return {
        primaryDiet,
        supportDiets,
        modifiers,
        preferences,
        conditions,
    };
}
