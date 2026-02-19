package com.mendrx.backend.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.mendrx.backend.exception.AIResponseFailedException;
import com.mendrx.backend.model.Deviation;
import com.mendrx.backend.model.PossibleReasons;
import com.mendrx.backend.util.DerivedMarkersCalculator;
import com.mendrx.backend.util.LoggingUtils;
import com.mendrx.backend.util.TrackerData;
import com.mendrx.backend.util.converter.BloodPanelUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mendrx.backend.enums.BloodMarkerResultEnum;
import com.mendrx.backend.model.Report;
import com.mendrx.backend.model.shared.BloodMarker;
import com.mendrx.backend.model.shared.ParameterData;
import com.mendrx.backend.model.shared.ParameterInfo;
import com.mendrx.backend.service.MultiTrackerFileService.ParameterDetails;

import static com.mendrx.backend.util.DerivedMarkersCalculator.derivingParameters;


@Service
public class RcaService {

	private static final Logger logger = LoggerFactory.getLogger(RcaService.class);

	@Autowired
	private ReportService reportService;

	@Autowired
	private NotesPromptService notesPromptService;

	@Autowired
	private ReasoningPromptService reasoningPromptService;

	@Autowired
	private MultiTrackerFileService multiTrackerFileService;

	public Report analyseBloodReport(Report report, List<ParameterData> bloodReportData, Integer parentId)
            throws AIResponseFailedException, IOException {

		HashMap<String, ParameterData> derivingParametersData = new HashMap<>();
		int validIndex = 0;

		for (int i = 0; i < bloodReportData.size(); i++) {
			ParameterData data = bloodReportData.get(i);
			if (data.getValue() != null && !data.getValue().trim().isEmpty()) {
				if (i != validIndex) {
					bloodReportData.set(validIndex, data);
				}

				if (derivingParameters.contains(data.getParameterName())) {
					derivingParametersData.put(data.getParameterName(), data);
				}

				validIndex++;
			}
		}

		if (validIndex < bloodReportData.size()) {
			bloodReportData.subList(validIndex, bloodReportData.size()).clear();
		}
		DerivedMarkersCalculator.getDerivedParametersData(bloodReportData, derivingParametersData, report);
		Map<String, ParameterInfo> optimalValues;

		TrackerData trackerData = multiTrackerFileService.getTrackerData(parentId);

		Map<String, ParameterDetails> detailedData = trackerData.getDetailedData();

		if ("MALE".equalsIgnoreCase(report.getGender()))
			optimalValues = trackerData.getMaleData();
		else
			optimalValues = trackerData.getFemaleData();

		List<String> bloodMarkersStringList = new ArrayList<>();

		Map<String, BloodMarker> bloodMarkerMap = new HashMap<>();

		for (ParameterData data : bloodReportData) {
			if (optimalValues.containsKey(data.getParameterName())) {

				try {
					ParameterInfo range = optimalValues.get(data.getParameterName());
					ParameterDetails details = detailedData.get(data.getParameterName());
					BloodMarker marker = new BloodMarker();
					marker.setParameterName(data.getParameterName());
					marker.setValue(data.getValue());
					marker.setUnits(data.getUnits());
					marker.setParameterInfo(range);

					double value = Double.parseDouble(data.getValue());
					BloodMarkerResultEnum result = checkValue(value, range.getMinValue(), range.getMaxValue());
					marker.setResult(result);
					marker.setDeviation(
							(int) Math.round(calculateDeviation(value, range.getMinValue(), range.getMaxValue())));

					// Set reason based on result
					if (details != null) {
						if (result == BloodMarkerResultEnum.LOW) {
							marker.setReason(String.valueOf(details.getLowReason()));
						} else if (result == BloodMarkerResultEnum.HIGH) {
							marker.setReason(String.valueOf(details.getHighReason()));
						}
					}
					bloodMarkersStringList.add(marker.toString());

					bloodMarkerMap.put(marker.getParameterName(), marker);

				} catch (Exception e) {
					LoggingUtils.logError(logger, "Error while constructing blood marker list: {}", e.getMessage());
				}

			}

		}
		List<BloodMarker> bloodMarkerList = new ArrayList<>(bloodMarkerMap.values());

		PossibleReasons possibleReasons = reasoningPromptService.getPossibleReasons(report, bloodMarkersStringList);
		HashMap<String, String> possibleReasonsMap = new HashMap<>();
		if (possibleReasons != null) {
			for (Deviation deviation : possibleReasons.getDeviations()) {
				if (!deviation.getDeviationReason().isBlank()) {
					possibleReasonsMap.put(deviation.getMarker(), deviation.getDeviationReason());
				}
			}
		}
		for (BloodMarker marker : bloodMarkerList) {
			if (marker.getDeviation() != 0 && !possibleReasonsMap.containsKey(marker.getParameterName())) {
                LoggingUtils.logWarn(logger, "AI response failed: Missing deviation reason for marker {}", marker.getParameterName());
				marker.setReason("");
			} else {
				marker.setReason(possibleReasonsMap.get(marker.getParameterName()));
			}
		}

		report.setBloodMarkers(bloodMarkerList);
		report.setBloodPanelListMap(BloodPanelUtils.constructBloodPanelListMap(bloodMarkerList));


		ObjectMapper objectMapper = new ObjectMapper();
		String jsonData = objectMapper.writeValueAsString(report.getBloodMarkers());
		report.setNotes(notesPromptService.getNotes(jsonData, report.getString()));
		report.setMigrationDone(true);
		return reportService.saveReport(report);

	}

	private BloodMarkerResultEnum checkValue(double value, double minValue, double maxValue) {
		if (value <= minValue) {
			return BloodMarkerResultEnum.LOW;
		} else if (value >= maxValue) {
			return BloodMarkerResultEnum.HIGH;
		} else {
			return BloodMarkerResultEnum.OPTIMAL;
		}
	}

	private double calculateDeviation(double value, double minValue, double maxValue) {
		if (value < minValue) {
			// Value is lower than the minimum value
			return ((minValue - value) / minValue) * 100;
		} else if (value > maxValue) {
			// Value is higher than the maximum value
			return ((value - maxValue) / maxValue) * 100;
		} else {
			// Value is within range, so deviation is 0
			return 0.0;
		}
	}

}
