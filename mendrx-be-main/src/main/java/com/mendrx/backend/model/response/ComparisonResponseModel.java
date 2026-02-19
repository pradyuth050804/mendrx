package com.mendrx.backend.model.response;

import com.mendrx.backend.enums.BloodMarkerResultEnum;
import com.mendrx.backend.enums.BloodPanelStatusEnum;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ComparisonResponseModel {
    private String comparisonId;
    private List<ReportInfo> reports;
    private List<PanelComparison> panelComparisons;
    private ComparisonSummary summary;

    public String getComparisonId() {
        return comparisonId;
    }

    public void setComparisonId(String comparisonId) {
        this.comparisonId = comparisonId;
    }

    public List<ReportInfo> getReports() {
        return reports;
    }

    public void setReports(List<ReportInfo> reports) {
        this.reports = reports;
    }

    public List<PanelComparison> getPanelComparisons() {
        return panelComparisons;
    }

    public void setPanelComparisons(List<PanelComparison> panelComparisons) {
        this.panelComparisons = panelComparisons;
    }

    public ComparisonSummary getSummary() {
        return summary;
    }

    public void setSummary(ComparisonSummary summary) {
        this.summary = summary;
    }

    public static class ReportInfo {
        private String id;
        private String clientName;
        private UUID clientId;
        private LocalDateTime updatedAt;
        private LocalDateTime reportDate;
        private String gender;
        private Integer age;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public UUID getClientId() {
            return clientId;
        }

        public void setClientId(UUID clientId) {
            this.clientId = clientId;
        }

        public String getClientName() {
            return clientName;
        }

        public void setClientName(String clientName) {
            this.clientName = clientName;
        }

        public LocalDateTime getUpdatedAt() {
            return updatedAt;
        }

        public void setUpdatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
        }

        public String getGender() {
            return gender;
        }

        public void setGender(String gender) {
            this.gender = gender;
        }

        public Integer getAge() {
            return age;
        }

        public void setAge(Integer age) {
            this.age = age;
        }

        public LocalDateTime getReportDate() {
            return reportDate;
        }

        public void setReportDate(LocalDateTime reportDate) {
            this.reportDate = reportDate;
        }
    }

    public static class PanelComparison {
        private String panelName;
        private BloodPanelStatusEnum status; // GOOD, FAIR, POOR
        private List<BloodMarkerComparison> bloodMarkerComparisons;

        public String getPanelName() {
            return panelName;
        }

        public void setPanelName(String panelName) {
            this.panelName = panelName;
        }

        public BloodPanelStatusEnum getStatus() {
            return status;
        }

        public void setStatus(BloodPanelStatusEnum status) {
            this.status = status;
        }

        public List<BloodMarkerComparison> getBloodMarkerComparisons() {
            return bloodMarkerComparisons;
        }

        public void setBloodMarkerComparisons(List<BloodMarkerComparison> bloodMarkerComparisons) {
            this.bloodMarkerComparisons = bloodMarkerComparisons;
        }
    }

    public static class BloodMarkerComparison {
        private String parameterName;
        private List<ParameterValue> values;
        private String trend;
        private Double percentageChange;
        private Range optimalRange;
        private boolean isPrimary;
        private double calibration;

        public String getParameterName() {
            return parameterName;
        }

        public void setParameterName(String parameterName) {
            this.parameterName = parameterName;
        }

        public List<ParameterValue> getValues() {
            return values;
        }

        public void setValues(List<ParameterValue> values) {
            this.values = values;
        }

        public String getTrend() {
            return trend;
        }

        public void setTrend(String trend) {
            this.trend = trend;
        }

        public Double getPercentageChange() {
            return percentageChange;
        }

        public void setPercentageChange(Double percentageChange) {
            this.percentageChange = percentageChange;
        }

        public Range getOptimalRange() {
            return optimalRange;
        }

        public void setOptimalRange(Range optimalRange) {
            this.optimalRange = optimalRange;
        }

        public boolean isPrimary() {
            return isPrimary;
        }

        public void setPrimary(boolean primary) {
            isPrimary = primary;
        }

        public double getCalibration() {
            return calibration;
        }

        public void setCalibration(double calibration) {
            this.calibration = calibration;
        }
    }

    public static class ParameterValue {
        private String reportId;
        private LocalDateTime reportDate;
        private Double value;
        private String unit;
        private BloodMarkerResultEnum status; // HIGH, LOW, OPTIMAL
        private Range genderSpecificRange;

        public String getReportId() {
            return reportId;
        }

        public void setReportId(String reportId) {
            this.reportId = reportId;
        }

        public Double getValue() {
            return value;
        }

        public void setValue(Double value) {
            this.value = value;
        }

        public String getUnit() {
            return unit;
        }

        public void setUnit(String unit) {
            this.unit = unit;
        }

        public BloodMarkerResultEnum getStatus() {
            return status;
        }

        public void setStatus(BloodMarkerResultEnum status) {
            this.status = status;
        }

        public LocalDateTime getReportDate() {
            return reportDate;
        }

        public void setReportDate(LocalDateTime reportDate) {
            this.reportDate = reportDate;
        }

        public Range getGenderSpecificRange() {
            return genderSpecificRange;
        }

        public void setGenderSpecificRange(Range genderSpecificRange) {
            this.genderSpecificRange = genderSpecificRange;
        }
    }

    public static class Range {
        private Double min;
        private Double max;

        public Double getMin() {
            return min;
        }

        public void setMin(Double min) {
            this.min = min;
        }

        public Double getMax() {
            return max;
        }

        public void setMax(Double max) {
            this.max = max;
        }
    }

    public static class ComparisonSummary {
        private int totalParameters;
        private int improvingCount;
        private int deterioratingCount;
        private int consistentCount;
        private int persistentlyHighCount;
        private int persistentlyLowCount;
        private int fluctuatingCount;
        private LocalDateTime comparisonDate;

        public int getDeterioratingCount() {
            return deterioratingCount;
        }

        public void setDeterioratingCount(int deterioratingCount) {
            this.deterioratingCount = deterioratingCount;
        }

        public int getTotalParameters() {
            return totalParameters;
        }

        public void setTotalParameters(int totalParameters) {
            this.totalParameters = totalParameters;
        }

        public int getImprovingCount() {
            return improvingCount;
        }

        public void setImprovingCount(int improvingCount) {
            this.improvingCount = improvingCount;
        }

        public int getFluctuatingCount() {
            return fluctuatingCount;
        }

        public void setFluctuatingCount(int fluctuatingCount) {
            this.fluctuatingCount = fluctuatingCount;
        }

        public LocalDateTime getComparisonDate() {
            return comparisonDate;
        }

        public void setComparisonDate(LocalDateTime comparisonDate) {
            this.comparisonDate = comparisonDate;
        }

        public int getConsistentCount() {
            return consistentCount;
        }

        public void setConsistentCount(int consistentCount) {
            this.consistentCount = consistentCount;
        }

        public int getPersistentlyHighCount() {
            return persistentlyHighCount;
        }

        public void setPersistentlyHighCount(int persistentlyHighCount) {
            this.persistentlyHighCount = persistentlyHighCount;
        }

        public int getPersistentlyLowCount() {
            return persistentlyLowCount;
        }

        public void setPersistentlyLowCount(int persistentlyLowCount) {
            this.persistentlyLowCount = persistentlyLowCount;
        }
    }
}
