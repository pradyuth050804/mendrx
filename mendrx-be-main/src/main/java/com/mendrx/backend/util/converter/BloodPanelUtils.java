package com.mendrx.backend.util.converter;

import com.mendrx.backend.enums.BloodMarkerResultEnum;
import com.mendrx.backend.enums.BloodPanelStatusEnum;
import com.mendrx.backend.model.BloodPanel;
import com.mendrx.backend.model.shared.BloodMarker;
import com.mendrx.backend.model.shared.ParameterData;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class BloodPanelUtils {

    public static Map<BloodPanel, List<BloodMarker>> constructBloodPanelListMap(List<BloodMarker> bloodMarkers) {
        // Filter duplicates by parameter name (keeping first occurrence)
        Map<String, BloodMarker> uniqueMarkers = bloodMarkers.stream()
                .collect(Collectors.toMap(
                        ParameterData::getParameterName,
                        marker -> marker,
                        (existing, replacement) -> existing  // Keep the first occurrence
                ));

        return uniqueMarkers.values().stream()
                .collect(Collectors.groupingBy(
                        marker -> marker.getParameterInfo().getPanelName()
                ))
                .entrySet()
                .stream()
                .collect(Collectors.toMap(
                        entry -> createBloodPanel(entry.getKey(), entry.getValue()),
                        Map.Entry::getValue
                ));
    }

    private static BloodPanel createBloodPanel(String panelName, List<BloodMarker> markers) {
        int optimalCount = countOptimalMarkers(markers);
        return new BloodPanel(
                panelName,
                optimalCount + "/" + markers.size(),
                calculateStatus(markers)
        );
    }

    private static int countOptimalMarkers(List<BloodMarker> markers) {
        return (int) markers.stream()
                .filter(marker -> marker.getResult() == BloodMarkerResultEnum.OPTIMAL)
                .count();
    }

    private static BloodPanelStatusEnum calculateStatus(List<BloodMarker> markers) {
        boolean isPrimaryDeviatedBeyondCalibration = false;
        boolean isSecondaryDeviatedBeyondCalibration = false;
        for(BloodMarker bloodMarker:markers) {
            if(bloodMarker.getDeviation()>=bloodMarker.getParameterInfo().getCalibration()) {
                if (bloodMarker.getParameterInfo().getIsPrimary()) {
                    isPrimaryDeviatedBeyondCalibration = true;
                    break;
                } else isSecondaryDeviatedBeyondCalibration = true;
            }
        }
        if(isPrimaryDeviatedBeyondCalibration)return BloodPanelStatusEnum.POOR;
        if(isSecondaryDeviatedBeyondCalibration)return BloodPanelStatusEnum.FAIR;
        return BloodPanelStatusEnum.GOOD;
    }
}
