package com.mendrx.backend.model;

import java.util.List;

public class ParameterExtractionTestResult {
    private String reportId;
    private int totalExpectedParameters;  // Total parameters in ground truth
    private int correctExtractions;       // True positives
    private int incorrectExtractions;     // Values present but incorrect
    private int missingExtractions;       // False negatives (in ground truth but not extracted)
    private int hallucinations;           // False positives (extracted but not in ground truth)
    private List<ParameterComparisonResult> detailedResults;

    public ParameterExtractionTestResult(String reportId, int totalExpectedParameters, int correctExtractions, int incorrectExtractions, int missingExtractions, int hallucinations, List<ParameterComparisonResult> detailedResults) {
        this.reportId = reportId;
        this.totalExpectedParameters = totalExpectedParameters;
        this.correctExtractions = correctExtractions;
        this.incorrectExtractions = incorrectExtractions;
        this.missingExtractions = missingExtractions;
        this.hallucinations = hallucinations;
        this.detailedResults = detailedResults;
    }

    public double getPrecision() {
        // Precision = True Positives / (True Positives + False Positives)
        return (correctExtractions + incorrectExtractions) == 0 ? 0 :
                (double) correctExtractions / (correctExtractions + incorrectExtractions + hallucinations);
    }

    public double getRecall() {
        // Recall = True Positives / (True Positives + False Negatives)
        return totalExpectedParameters == 0 ? 0 :
                (double) correctExtractions / totalExpectedParameters;
    }

    public double getF1Score() {
        double precision = getPrecision();
        double recall = getRecall();
        return precision + recall == 0 ? 0 :
                2 * (precision * recall) / (precision + recall);
    }

    public String getReportId() {
        return reportId;
    }

    public int getTotalExpectedParameters() {
        return totalExpectedParameters;
    }

    public int getCorrectExtractions() {
        return correctExtractions;
    }

    public int getIncorrectExtractions() {
        return incorrectExtractions;
    }

    public int getMissingExtractions() {
        return missingExtractions;
    }

    public int getHallucinations() {
        return hallucinations;
    }

    public List<ParameterComparisonResult> getDetailedResults() {
        return detailedResults;
    }
}