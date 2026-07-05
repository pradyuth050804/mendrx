/**
 * Transforms the MendRx report data structure into the shape
 * expected by mapToDietConfig({ bloodMarkers, analysis }).
 *
 * @param report - The report object from analysisResult.report or ReportsViewClient
 * @returns { bloodMarkers, analysis } ready for mapToDietConfig
 */

interface BloodMarkerInput {
    parameterName: string;
    value: string;
    units: string;
    result: "OPTIMAL" | "HIGH" | "LOW";
    deviation: number;
}

interface ReportInput {
    bloodPanelListMap?: Record<string, BloodMarkerInput[]>;
    bmi?: string;
    diet?: string;
    existingConditions?: string[];
    lifestyleHabits?: string[];
    height?: string;
    weight?: string;
}

export function buildDietInputFromReport(report: ReportInput) {
    if (!report || !report.bloodPanelListMap) {
        return null;
    }

    // --- 1. Flatten bloodPanelListMap into { parameterName: numericValue } ---
    const bloodMarkers: Record<string, number> = {};
    const allMarkers = Object.values(report.bloodPanelListMap).flat();

    for (const marker of allMarkers) {
        const val = parseFloat(marker.value);
        if (!isNaN(val)) {
            // Normalize common parameter names to match mapToDietConfig expectations
            const name = normalizeParamName(marker.parameterName);
            bloodMarkers[name] = val;
        }
    }

    // --- 2. Derive analysis object from report metadata + marker results ---
    const conditions = report.existingConditions || [];
    const habits = report.lifestyleHabits || [];

    // Derive BMI category from the bmi string field
    const bmiValue = parseFloat(report.bmi || "0");
    let bmiCategory = "Normal";
    if (bmiValue > 0) {
        if (bmiValue < 18.5) bmiCategory = "Underweight";
        else if (bmiValue < 25) bmiCategory = "Normal";
        else if (bmiValue < 30) bmiCategory = "Overweight";
        else bmiCategory = "Obese";
    }

    // Check for inflammation from markers
    const hsCRP = bloodMarkers["hsCRP"] ?? bloodMarkers["CRP"] ?? null;
    const inflammation = hsCRP !== null && hsCRP > 3 ? "High" : "Normal";

    // Check for gut issues from existing conditions or marker patterns
    const gutConditions = ["IBS", "IBD", "Crohn's", "Ulcerative Colitis", "Leaky Gut"];
    const gutIssues = conditions.some((c: string) =>
        gutConditions.some((gc) => c.toLowerCase().includes(gc.toLowerCase()))
    );

    const ibs = conditions.some((c: string) => c.toLowerCase().includes("ibs"));

    // Detect deficiencies from HIGH/LOW markers
    const deficiencies: string[] = [];
    for (const marker of allMarkers) {
        if (marker.result === "LOW") {
            if (marker.parameterName.toLowerCase().includes("iron") ||
                marker.parameterName.toLowerCase().includes("ferritin")) {
                deficiencies.push("Iron");
            }
            if (marker.parameterName.toLowerCase().includes("vitamin d") ||
                marker.parameterName.toLowerCase().includes("25-oh")) {
                deficiencies.push("Vitamin D");
            }
            if (marker.parameterName.toLowerCase().includes("b12") ||
                marker.parameterName.toLowerCase().includes("cobalamin")) {
                deficiencies.push("B12");
            }
            if (marker.parameterName.toLowerCase().includes("albumin")) {
                deficiencies.push("Protein");
            }
        }
    }

    // Sensitivities from existing conditions
    const sensitivities: string[] = [];
    if (conditions.some((c: string) => c.toLowerCase().includes("lactose"))) sensitivities.push("Lactose");
    if (conditions.some((c: string) => c.toLowerCase().includes("gluten"))) sensitivities.push("Gluten");

    const analysis = {
        bmiCategory,
        inflammation,
        gutIssues,
        ibs,
        deficiencies: Array.from(new Set(deficiencies)), // deduplicate
        sensitivities,
        conditions,
        diet: report.diet || "",
        acuteGutInflammation: false, // conservative default
        gutSeverity: gutIssues ? "Moderate" : "None",
    };

    return { bloodMarkers, analysis };
}

/**
 * Normalizes common blood parameter names to the keys expected by mapToDietConfig.
 */
function normalizeParamName(name: string): string {
    const lower = name.toLowerCase().trim();

    // Direct mappings
    const mappings: Record<string, string> = {
        "hs-crp": "hsCRP",
        "hs crp": "hsCRP",
        "high sensitivity crp": "hsCRP",
        "c-reactive protein": "hsCRP",
        "crp": "CRP",
        "alt": "ALT",
        "sgpt": "ALT",
        "alanine aminotransferase": "ALT",
        "ast": "AST",
        "sgot": "AST",
        "aspartate aminotransferase": "AST",
        "ggt": "GGT",
        "gamma gt": "GGT",
        "gamma-glutamyl transferase": "GGT",
        "fasting glucose": "glucose",
        "blood glucose": "glucose",
        "glucose": "glucose",
        "glucose, fasting": "glucose",
        "hba1c": "HbA1c",
        "glycated hemoglobin": "HbA1c",
        "hemoglobin a1c": "HbA1c",
        "triglycerides": "triglycerides",
        "tsh": "TSH",
        "thyroid stimulating hormone": "TSH",
        "hemoglobin": "hemoglobin",
        "hb": "hemoglobin",
        "haemoglobin": "hemoglobin",
        "albumin": "albumin",
        "serum albumin": "albumin",
    };

    for (const [pattern, normalized] of Object.entries(mappings)) {
        if (lower === pattern || lower.includes(pattern)) {
            return normalized;
        }
    }

    // Return original if no mapping found
    return name;
}
