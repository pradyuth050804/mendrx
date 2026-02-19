package com.mendrx.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mendrx.backend.model.BloodReportGroundTruth;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class GroundTruthService {

    private static final Logger logger = LoggerFactory.getLogger(GroundTruthService.class);

    private static final String GROUND_TRUTH_FILE = "src/test/resources/ground_truth/blood_reports_ground_truth.json";
    private final ObjectMapper objectMapper;

    public GroundTruthService() {
        this.objectMapper = new ObjectMapper();
    }

    public Map<String, BloodReportGroundTruth> loadGroundTruthData() {
        try {
            JsonNode rootNode = objectMapper.readTree(new File(GROUND_TRUTH_FILE));
            List<BloodReportGroundTruth> reports = objectMapper.convertValue(
                    rootNode.get("bloodReports"),
                    new TypeReference<List<BloodReportGroundTruth>>() {}
            );
            return reports.stream()
                    .collect(Collectors.toMap(BloodReportGroundTruth::getReportFileName, Function.identity()));
        } catch (IOException e) {
            LoggingUtils.logError(logger, "Error loading ground truth data", e);
            return Collections.emptyMap();
        }
    }
}
