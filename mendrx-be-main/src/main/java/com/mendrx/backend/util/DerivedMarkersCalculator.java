package com.mendrx.backend.util;

import com.mendrx.backend.model.Report;
import com.mendrx.backend.model.shared.ParameterData;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;

public class DerivedMarkersCalculator {
    private static final double EULER = Math.E;
    public static final HashSet<String> derivingParameters = new HashSet<>(List.of("Hematocrit", "Total Protein", "Sodium", "Potassium", "BUN", "Fasting Blood Glucose", "Triglycerides", "GGT"));
    /**
     * Calculates an approximate blood viscosity using the formula:
     *   Viscosity = (0.12 × Hematocrit) + (0.17 × (Total Protein × 10)) − 2.07
     *
     * @param hematocritPercent  Hematocrit in percent (e.g., 45.0 for 45%)
     * @param totalProteinGdL    Total protein in g/dL (e.g., 7.0 g/dL)
     * @return                   Approximate blood viscosity in centipoise (cP)
     */
    public static double calculateViscosity(double hematocritPercent, double totalProteinGdL) {
        // Multiply total protein in g/dL by 10 to convert to g/L, as implied by the formula.
        return (0.12 * hematocritPercent)
                + (0.17 * (totalProteinGdL * 10))
                - 2.07;
    }
    /**
     * Calculates an approximate serum osmolarity using the formula:
     *   Osmolarity = 1.9 × (Sodium + Potassium)
     *                + (Fasting Blood Sugar / 18)
     *                + (0.5 × 0.357 × BUN)
     *                + 5
     *
     * @param sodium_mEqL               Serum sodium in mEq/L
     * @param potassium_mEqL            Serum potassium in mEq/L
     * @param fastingBloodSugar_mgPerDl Fasting blood sugar in mg/dL
     * @param bun_mgPerDl               Blood Urea Nitrogen (BUN) in mg/dL
     * @return                          Approximate osmolarity in mOsm/L
     */
    public static double calculateOsmolarity(double sodium_mEqL,
                                             double potassium_mEqL,
                                             double fastingBloodSugar_mgPerDl,
                                             double bun_mgPerDl) {
        return 1.9 * (sodium_mEqL + potassium_mEqL)
                + (fastingBloodSugar_mgPerDl / 18.0)
                + (0.5 * 0.357 * bun_mgPerDl)
                + 5.0;
    }
    public static double calculateFLI(double triglycerides, double bmi,
                                      double ggu, double waistCircumferenceInches) {
        double waistCircumferenceCm = waistCircumferenceInches * 2.54;

        double fliScore = 0.953 * Math.log(triglycerides)
                + 0.139 * bmi
                + 0.718 * Math.log(ggu)
                + 0.053 * waistCircumferenceCm
                - 15.745;

        return (100 / (1 + Math.pow(EULER, -fliScore)));
    }
    public static double calculateBMI(double weightKg, double heightMeters) {
        double bmi = weightKg / (heightMeters * heightMeters);
        return Math.round(bmi * 10.0) / 10.0;
    }

    public static void  getDerivedParametersData(List<ParameterData> bloodReportData, HashMap<String, ParameterData> derivingParametersData, Report report) {
        if(derivingParametersData.containsKey("Hematocrit") && derivingParametersData.containsKey("Total Protein")) {
            bloodReportData.add(new ParameterData("Viscosity", String.format("%.2f", calculateViscosity(Double.parseDouble(derivingParametersData.get("Hematocrit").getValue()), Double.parseDouble(derivingParametersData.get("Total Protein").getValue()))), null));
        }
        if(derivingParametersData.containsKey("Sodium") && derivingParametersData.containsKey("Potassium") && derivingParametersData.containsKey("BUN") && derivingParametersData.containsKey("Fasting Blood Glucose")) {
            bloodReportData.add(new ParameterData("Osmolarity", String.format("%.2f", calculateOsmolarity(Double.parseDouble(derivingParametersData.get("Sodium").getValue()), Double.parseDouble(derivingParametersData.get("Potassium").getValue()), Double.parseDouble(derivingParametersData.get("Fasting Blood Glucose").getValue()), Double.parseDouble(derivingParametersData.get("BUN").getValue()))), null) );
        }
        if(report.getWeight()!=null && report.getHeight()!=null) {
            double bmi = calculateBMI(report.getWeight(), report.getHeight() / 100.0);
            if(derivingParametersData.containsKey("Triglycerides") && derivingParametersData.containsKey("GGT") && report.getWaist()!=null) {
                double fli = calculateFLI(Double.parseDouble(derivingParametersData.get("Triglycerides").getValue()), bmi, Double.parseDouble(derivingParametersData.get("GGT").getValue()), report.getWaist());
                bloodReportData.add(new ParameterData("Fatty Liver Index",
                        String.format("%.2f", fli),
                        null));            }
        }
    }
}
