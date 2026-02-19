package com.mendrx.backend.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import com.mendrx.backend.util.LoggingUtils;
import com.mendrx.backend.util.TrackerData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.mendrx.backend.model.response.ReadFileResponseModel;
import com.mendrx.backend.model.shared.ParameterData;
import com.mendrx.backend.model.shared.ParameterInfo;
import com.mendrx.backend.model.shared.ParameterUnitMismatch;

@Service
public class CsvToJsonService {

    @Autowired
    private MultiTrackerFileService multiTrackerFileService;

    private static final Logger logger = LoggerFactory.getLogger(CsvToJsonService.class);

    public ReadFileResponseModel convertCsvToReadFileResponseModel(String csvData, String gender, String message, Integer parentId, List<ParameterUnitMismatch> unitMismatches) {
        try {
            List<String> lines = Arrays.asList(csvData.split("\n"));
            if (lines.size() < 2) {
                //TODO show in UI that incorrect PDF submitted.
                throw new IllegalArgumentException("CSV data must contain at least a header and one data row");
            }

            String[] headers = lines.get(0).split(",");
            List<ParameterData> parameterDataList = new ArrayList<>();
            List<String> largelyDeviatedParams = new ArrayList<>();
            Map<String, ParameterInfo> optimalValues;

            TrackerData trackerData = multiTrackerFileService.getTrackerData(parentId);


            if ("MALE".equalsIgnoreCase(gender))
                optimalValues = trackerData.getMaleData();
            else
                optimalValues = trackerData.getFemaleData();

            for (int i = 1; i < lines.size(); i++) {
                String line = lines.get(i).trim();
                if (line.isEmpty()) {
                    continue; // Skip empty lines
                }

                String[] values = line.split(",", -1); // -1 to keep trailing empty values

                String parameterName = values[0].trim();
                String value = values.length > 1 ? values[1].trim() : "";
                String unit = values.length > 2 ? values[2].trim() : "";

                if (!parameterName.isEmpty()) {
                    ParameterData parameterData = new ParameterData(parameterName, value, unit);
                    parameterData.setParameterInfo(optimalValues.get(parameterName));
                    parameterDataList.add(parameterData);
                    try {
                        if(!value.isEmpty() && (!optimalValues.containsKey(parameterName) || isLargelyDeviated(Double.parseDouble(value), optimalValues.get(parameterName)))) {
                            largelyDeviatedParams.add(parameterName);
                        }
                    } catch (Exception e) {
                        largelyDeviatedParams.add(parameterName);
                        LoggingUtils.logError(logger, "Failed to check large deviation for: {}", parameterName, e);
                    }

                }
            }

            if(parameterDataList.isEmpty()) {
                throw new RuntimeException("No parameters extracted");
            }

            return new ReadFileResponseModel(parameterDataList, message, largelyDeviatedParams, unitMismatches);
        } catch (Exception e) {
            LoggingUtils.logWarn(logger, "Failed to extract parameters from csvData: {}", csvData);
            LoggingUtils.logError(logger, "Error converting CSV to API Response", e);
            throw new RuntimeException("Error converting CSV to API Response", e);
        }
    }

    private boolean isLargelyDeviated(double value, ParameterInfo parameterRange) {
        double minValue = parameterRange.getMinValue();
        double maxValue = parameterRange.getMaxValue();

        return value <= 0.1 * minValue || value >= 3 * maxValue;
    }
}