package com.mendrx.backend.service;

import com.mendrx.backend.enums.BloodPanelStatusEnum;
import com.mendrx.backend.enums.ComparisonTrendEnum;
import com.mendrx.backend.model.Report;
import com.mendrx.backend.model.response.ComparisonResponseModel;
import com.mendrx.backend.model.shared.BloodMarker;
import com.mendrx.backend.model.shared.ParameterInfo;
import com.mendrx.backend.util.LoggingUtils;
import com.mendrx.backend.util.TrackerData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ComparisonService {
    @Autowired
    private ReportService reportService;

    @Autowired
    private MultiTrackerFileService multiTrackerFileService;

    public ComparisonResponseModel compareReports(List<Report> reports) {
        // First sort reports by date to maintain chronological order
        reports.sort(Comparator.comparing(Report::getReportDate));
        String latestReportId = reports.get(reports.size() - 1).getId().toString();

        ComparisonResponseModel response = new ComparisonResponseModel();
        response.setComparisonId(UUID.randomUUID().toString());
        response.setReports(mapReportInfo(reports));

        // Get parameter details and valid parameters using first report's gender
        String gender = reports.get(0).getGender();
        Map<String, ParameterInfo> parameterDetails = getParameterDetails(gender, reports.get(0).getUser().getParent().getId());
        Set<String> validParameters = parameterDetails.keySet();

        // Find parameters that exist in at least one report and are valid
        Set<String> existingParameters = reports.stream()
                .flatMap(report -> report.getBloodMarkers().stream())
                .map(BloodMarker::getParameterName)
                .filter(validParameters::contains)
                .collect(Collectors.toSet());

        // Group parameters by panel
        Map<String, List<ComparisonResponseModel.BloodMarkerComparison>> panelWiseComparisons =
                createPanelWiseComparisons(reports, existingParameters, parameterDetails);

        // Create panel comparisons
        List<ComparisonResponseModel.PanelComparison> panelComparisons = panelWiseComparisons.entrySet().stream()
                .map(entry -> createPanelComparison(
                        entry.getKey(),
                        entry.getValue(),
                        latestReportId))
                .collect(Collectors.toList());


        response.setPanelComparisons(panelComparisons);
        response.setSummary(createSummary(panelComparisons));

        return response;
    }

    private Map<String, List<ComparisonResponseModel.BloodMarkerComparison>> createPanelWiseComparisons(
            List<Report> reports,
            Set<String> existingParameters,
            Map<String, ParameterInfo> parameterDetails) {

        // Create comparisons only for parameters that exist in at least one report
        Map<String, ComparisonResponseModel.BloodMarkerComparison> comparisons = existingParameters.stream()
                .collect(Collectors.toMap(
                        paramName -> paramName,
                        paramName -> createBloodMarkerComparison(
                                paramName,
                                reports,
                                parameterDetails.get(paramName)
                        )
                ));

        // Group by panel
        return comparisons.values().stream()
                .collect(Collectors.groupingBy(
                        comparison -> parameterDetails.get(comparison.getParameterName()).getPanelName()
                ));
    }

    private List<ComparisonResponseModel.ReportInfo> mapReportInfo(List<Report> reports) {
        return reports.stream()
                .map(report -> {
                    ComparisonResponseModel.ReportInfo info = new ComparisonResponseModel.ReportInfo();
                    info.setId(report.getId().toString());
                    info.setClientId(report.getClient().getId());
                    info.setClientName(report.getClient().getName());
                    info.setUpdatedAt(report.getUpdatedAt());
                    info.setReportDate(report.getReportDate());
                    info.setGender(report.getGender());
                    info.setAge(report.getAgeOnReportDate());
                    return info;
                })
                .collect(Collectors.toList());
    }


    private ComparisonResponseModel.BloodMarkerComparison createBloodMarkerComparison(
            String parameterName,
            List<Report> reports,
            ParameterInfo info) {

        ComparisonResponseModel.BloodMarkerComparison comparison = new ComparisonResponseModel.BloodMarkerComparison();
        comparison.setParameterName(parameterName);

        // Create a map of reportId to marker for the specific parameter
        Map<UUID, BloodMarker> markersByReportId = new HashMap<>();
        for (Report report : reports) {
            // Find marker for this parameter in the report's blood markers
            Optional<BloodMarker> markerForReport = report.getBloodMarkers().stream()
                    .filter(m -> m.getParameterName().equals(parameterName))
                    .findFirst();

            // Only add to map if marker exists for this report
            markerForReport.ifPresent(marker -> markersByReportId.put(report.getId(), marker));
        }

        // Create values list by matching reports with their markers
        List<ComparisonResponseModel.ParameterValue> values = reports.stream()
                .filter(report -> markersByReportId.containsKey(report.getId()))
                .map(report -> {
                    BloodMarker marker = markersByReportId.get(report.getId());
                    ComparisonResponseModel.ParameterValue value = new ComparisonResponseModel.ParameterValue();
                    value.setReportId(report.getId().toString());
                    value.setReportDate(report.getReportDate());
                    try {
                        value.setValue(Double.parseDouble(marker.getValue()));
                        value.setUnit(marker.getUnits());
                        value.setStatus(marker.getResult());
                        return value;
                    } catch (NumberFormatException e) {
                        // Log error and skip this value
                        // logger.warn("Unable to parse value for parameter: " + parameterName + " in report: " + report.getId());
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(ComparisonResponseModel.ParameterValue::getReportDate))
                .collect(Collectors.toList());

        comparison.setValues(values);

        // Set parameter details if available
        if (info != null) {
            ComparisonResponseModel.Range range = new ComparisonResponseModel.Range();
            range.setMin(info.getMinValue());
            range.setMax(info.getMaxValue());
            comparison.setOptimalRange(range);
            comparison.setPrimary(info.getIsPrimary());
            comparison.setCalibration(info.getCalibration());

            // Calculate trend only if we have enough values
            // Find where we set the trend in the comparison
            if (!values.isEmpty()) {
                ComparisonTrendEnum trend = calculateTrend(values, range);
                comparison.setTrend(trend != null ? trend.toString() : null);

                // Calculate percentage change if we have at least 2 values
                if (values.size() >= 2) {
                    double oldestValue = values.get(0).getValue();
                    double newestValue = values.get(values.size() - 1).getValue();
                    double percentageChange = ((newestValue - oldestValue) / oldestValue) * 100;
                    comparison.setPercentageChange(percentageChange);
                } else {
                    comparison.setPercentageChange(0.0);
                }
            }
        }

        return comparison;
    }

    private ComparisonResponseModel.PanelComparison createPanelComparison(
            String panelName,
            List<ComparisonResponseModel.BloodMarkerComparison> comparisons,
            String latestReportId) {

        ComparisonResponseModel.PanelComparison panel = new ComparisonResponseModel.PanelComparison();
        panel.setPanelName(panelName);
        panel.setBloodMarkerComparisons(comparisons);

        // Calculate panel status based only on parameters in latest report
        BloodPanelStatusEnum status = calculatePanelStatus(comparisons, latestReportId);
        panel.setStatus(status);

        return panel;
    }

    private BloodPanelStatusEnum calculatePanelStatus(
            List<ComparisonResponseModel.BloodMarkerComparison> comparisons,
            String latestReportId) {

        boolean isPrimaryDeviatedBeyondCalibration = false;
        boolean isSecondaryDeviatedBeyondCalibration = false;

        for (ComparisonResponseModel.BloodMarkerComparison comparison : comparisons) {
            // Get value from latest report only
            Optional<ComparisonResponseModel.ParameterValue> latestValue = comparison.getValues().stream()
                    .filter(v -> v.getReportId().equals(latestReportId) && v.getValue() != null)
                    .findFirst();

            if (latestValue.isPresent()) {
                double value = latestValue.get().getValue();
                ComparisonResponseModel.Range range = comparison.getOptimalRange();

                double midRange = (range.getMax() + range.getMin()) / 2;
                double deviation = Math.abs(value - midRange) / midRange * 100;

                if (deviation >= comparison.getCalibration()) {
                    if (comparison.isPrimary()) {
                        isPrimaryDeviatedBeyondCalibration = true;
                        break;
                    } else {
                        isSecondaryDeviatedBeyondCalibration = true;
                    }
                }
            }
        }

        if (isPrimaryDeviatedBeyondCalibration) return BloodPanelStatusEnum.POOR;
        if (isSecondaryDeviatedBeyondCalibration) return BloodPanelStatusEnum.FAIR;
        return BloodPanelStatusEnum.GOOD;
    }
    private ComparisonResponseModel.ComparisonSummary createSummary(List<ComparisonResponseModel.PanelComparison> panelComparisons) {
        ComparisonResponseModel.ComparisonSummary summary = new ComparisonResponseModel.ComparisonSummary();

        int improving = 0, deteriorating = 0, consistent = 0;
        int persistentlyHigh = 0, persistentlyLow = 0, fluctuating = 0;
        int total = 0;

        for (ComparisonResponseModel.PanelComparison panel : panelComparisons) {
            for (ComparisonResponseModel.BloodMarkerComparison marker : panel.getBloodMarkerComparisons()) {
                String trend = marker.getTrend();
                if (trend != null) {  // Only count if there's a trend
                    total++;
                    switch (trend) {
                        case "IMPROVING": improving++; break;
                        case "DETERIORATING": deteriorating++; break;
                        case "CONSISTENT": consistent++; break;
                        case "PERSISTENTLY_HIGH": persistentlyHigh++; break;
                        case "PERSISTENTLY_LOW": persistentlyLow++; break;
                        case "FLUCTUATING": fluctuating++; break;
                    }
                }
            }
        }

        summary.setTotalParameters(total);
        summary.setImprovingCount(improving);
        summary.setDeterioratingCount(deteriorating);
        summary.setConsistentCount(consistent);
        summary.setPersistentlyHighCount(persistentlyHigh);
        summary.setPersistentlyLowCount(persistentlyLow);
        summary.setFluctuatingCount(fluctuating);
        summary.setComparisonDate(LocalDateTime.now());

        return summary;
    }
    private ComparisonTrendEnum calculateTrend(List<ComparisonResponseModel.ParameterValue> values, ComparisonResponseModel.Range optimalRange) {
        if (values.size() < 2) {
            return null;
        }

        double lastButOneValue = values.get(values.size() - 2).getValue();
        double lastValue = values.get(values.size() - 1).getValue();
        double minRange = optimalRange.getMin();
        double maxRange = optimalRange.getMax();
        double midRange = (minRange + maxRange) / 2;
        double changePercentage = Math.abs((lastValue - lastButOneValue) / lastButOneValue * 100);

        // Helper function to determine zone
        Function<Double, String> getZone = (value) -> {
            if (value >= maxRange) return "HIGH";
            if (value <= minRange) return "LOW";
            return "OPTIMAL";
        };

        String lastButOneZone = getZone.apply(lastButOneValue);
        String lastZone = getZone.apply(lastValue);

        // If both values are in optimal range
        if (lastButOneZone.equals("OPTIMAL") && lastZone.equals("OPTIMAL")) {
            boolean firstAboveMid = lastButOneValue > midRange;
            boolean lastAboveMid = lastValue > midRange;

            // If one is below mid and other is above mid
            if (firstAboveMid != lastAboveMid && changePercentage <= 5) {
                return ComparisonTrendEnum.CONSISTENT;
            }

            // Both above mid-range
            if (firstAboveMid && lastAboveMid) {
                if(lastValue >= lastButOneValue) {
                    if(changePercentage <= 5) return ComparisonTrendEnum.CONSISTENT;
                    else return ComparisonTrendEnum.FLUCTUATING;
                }
                else return ComparisonTrendEnum.IMPROVING;
            }

            // Both below mid-range
            if (!firstAboveMid && !lastAboveMid) {
                if(lastValue <= lastButOneValue) {
                    if(changePercentage <= 5) return ComparisonTrendEnum.CONSISTENT;
                    else return ComparisonTrendEnum.FLUCTUATING;
                }
                else return ComparisonTrendEnum.IMPROVING;
            }
        }

        // For non-optimal zones
        if (lastButOneZone.equals("HIGH")) {
            if (lastZone.equals("OPTIMAL")) {
                return ComparisonTrendEnum.IMPROVING;
            }
            if (lastZone.equals("LOW")) {
                return ComparisonTrendEnum.FLUCTUATING;
            }
            if(lastValue > lastButOneValue) return ComparisonTrendEnum.DETERIORATING;
            if(lastValue < lastButOneValue) return ComparisonTrendEnum.IMPROVING;
            return ComparisonTrendEnum.PERSISTENTLY_HIGH;
        }

        if (lastButOneZone.equals("LOW")) {
            if (lastZone.equals("OPTIMAL")) {
                return ComparisonTrendEnum.IMPROVING;
            }
            if (lastZone.equals("HIGH")) {
                return ComparisonTrendEnum.FLUCTUATING;
            }
            if(lastValue < lastButOneValue) return ComparisonTrendEnum.DETERIORATING;
            if(lastValue > lastButOneValue) return ComparisonTrendEnum.IMPROVING;
            return ComparisonTrendEnum.PERSISTENTLY_LOW;
        }

        if (lastButOneZone.equals("OPTIMAL")) {
            if (lastZone.equals("HIGH") || lastZone.equals("LOW")) {
                return ComparisonTrendEnum.DETERIORATING;
            }
        }

        // If zones are different and not handled above
        return ComparisonTrendEnum.FLUCTUATING;
    }

    private Map<String, ParameterInfo> getParameterDetails(String gender, Integer parentId) {
        // Select gender-specific optimal values based on the first report's gender
        Map<String, ParameterInfo> optimalValues;

        TrackerData trackerData = multiTrackerFileService.getTrackerData(parentId);

        if ("MALE".equalsIgnoreCase(gender)) {
            optimalValues = trackerData.getMaleData();
        } else {
            optimalValues = trackerData.getFemaleData();
        }
        return optimalValues;
    }

    public ComparisonResponseModel compareReportsMultiClient(List<Report> reports) {
        reports.sort(Comparator.comparing(Report::getReportDate));

        ComparisonResponseModel response = new ComparisonResponseModel();
        response.setComparisonId(UUID.randomUUID().toString());
        response.setReports(mapReportInfo(reports));

        TrackerData trackerData = multiTrackerFileService.getTrackerData(reports.get(0).getUser().getParent().getId());

        // Get all valid parameters regardless of gender
        Set<String> validParameters = trackerData.getMaleData().keySet(); // Since parameter names are same for both genders

        // Find parameters that exist in at least one report and are valid
        Set<String> existingParameters = reports.stream()
                .flatMap(report -> report.getBloodMarkers().stream())
                .map(BloodMarker::getParameterName)
                .filter(validParameters::contains)
                .collect(Collectors.toSet());

        // Get parameter details for different genders
        Map<String, Map<String, ParameterInfo>> genderParameterDetails = new HashMap<>();
        genderParameterDetails.put("MALE", trackerData.getMaleData());
        genderParameterDetails.put("FEMALE", trackerData.getFemaleData());

        // Group parameters by panel - using simplified comparison
        Map<String, List<ComparisonResponseModel.BloodMarkerComparison>> panelWiseComparisons =
                createPanelWiseComparisonsMultiClient(reports, existingParameters, genderParameterDetails);

        List<ComparisonResponseModel.PanelComparison> panelComparisons = panelWiseComparisons.entrySet().stream()
                .map(entry -> {
                    ComparisonResponseModel.PanelComparison panel = new ComparisonResponseModel.PanelComparison();
                    panel.setPanelName(entry.getKey());
                    panel.setBloodMarkerComparisons(entry.getValue());
                    return panel;
                })
                .collect(Collectors.toList());

        response.setPanelComparisons(panelComparisons);
        response.setSummary(null);

        return response;
    }

    private Map<String, List<ComparisonResponseModel.BloodMarkerComparison>> createPanelWiseComparisonsMultiClient(
            List<Report> reports,
            Set<String> existingParameters,
            Map<String, Map<String, ParameterInfo>> genderParameterDetails) {

        // First, get a mapping of parameter name to panel name (same for both genders)
        Map<String, String> parameterToPanelMap = genderParameterDetails.get("MALE").entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().getPanelName()
                ));

        Map<String, ComparisonResponseModel.BloodMarkerComparison> comparisons = existingParameters.stream()
                .collect(Collectors.toMap(
                        paramName -> paramName,
                        paramName -> createBloodMarkerComparisonMultiClient(
                                paramName,
                                reports,
                                genderParameterDetails
                        )
                ));

        return comparisons.values().stream()
                .collect(Collectors.groupingBy(
                        comparison -> parameterToPanelMap.get(comparison.getParameterName())
                ));
    }

    private ComparisonResponseModel.BloodMarkerComparison createBloodMarkerComparisonMultiClient(
            String parameterName,
            List<Report> reports,
            Map<String, Map<String, ParameterInfo>> genderParameterDetails) {

        ComparisonResponseModel.BloodMarkerComparison comparison = new ComparisonResponseModel.BloodMarkerComparison();
        comparison.setParameterName(parameterName);

        // Create values list with gender-specific optimal ranges
        List<ComparisonResponseModel.ParameterValue> values = reports.stream()
                .flatMap(report -> report.getBloodMarkers().stream()
                        .filter(m -> m.getParameterName().equals(parameterName))
                        .map(marker -> {
                            ComparisonResponseModel.ParameterValue value = new ComparisonResponseModel.ParameterValue();
                            value.setReportId(report.getId().toString());
                            value.setReportDate(report.getReportDate());
                            try {
                                value.setValue(Double.parseDouble(marker.getValue()));
                                value.setUnit(marker.getUnits());
                                value.setStatus(marker.getResult());

                                // Add gender-specific range to each value
                                ParameterInfo info = genderParameterDetails.get(report.getGender().toUpperCase())
                                        .get(parameterName);
                                ComparisonResponseModel.Range range = new ComparisonResponseModel.Range();
                                range.setMin(info.getMinValue());
                                range.setMax(info.getMaxValue());
                                value.setGenderSpecificRange(range);

                                return value;
                            } catch (NumberFormatException e) {
                                return null;
                            }
                        }))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(ComparisonResponseModel.ParameterValue::getReportDate))
                .collect(Collectors.toList());

        comparison.setValues(values);

        // Set a generic range using male values (can be changed as per requirement)
        ParameterInfo maleInfo = genderParameterDetails.get("MALE").get(parameterName);
        if (maleInfo != null) {
            comparison.setPrimary(maleInfo.getIsPrimary());
            comparison.setCalibration(maleInfo.getCalibration());
        }

        return comparison;
    }
}
