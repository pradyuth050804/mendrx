package com.mendrx.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException; // Jackson Exception
import com.fasterxml.jackson.databind.ObjectMapper; // Jackson ObjectMapper
import com.mendrx.backend.util.LoggingUtils;
import org.apache.poi.ss.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service responsible for loading lifestyle recommendation templates from XLSX files
 * and generating an initial JSON structure based on selected panels.
 * Reads specified sheets (e.g., Blood, Kidney) from files named like 'lifestyle_recommendations_{id}.xlsx'.
 * Parses sheet columns dynamically based on headers to create item attributes.
 */
@Service
public class LifestyleRecTemplateService {

    private static final Logger logger = LoggerFactory.getLogger(LifestyleRecTemplateService.class);

    @Value("${lifestyle.rec.template.folder.path}")
    private String templateFolderPath;

    private static final Pattern FILENAME_PATTERN = Pattern.compile("lifestyle_recommendations_(\\d+)\\.xlsx", Pattern.CASE_INSENSITIVE);
    private static final Set<String> RELEVANT_SHEET_NAMES = Set.of("Blood", "Kidney", "Liver", "Thyroid", "Metabolism", "Toxin Elimination");

    // Structure: Map<TemplateID, Map<PanelName, List<LifestyleRecommendationItemData>>>
    // PanelName corresponds to the Sheet Name (e.g., "Blood", "Metabolism")
    // LifestyleRecommendationItemData now holds a Map<String, String> of attributes
    private final Map<Integer, Map<String, List<LifestyleRecommendationItemData>>> templateDataMap = new ConcurrentHashMap<>();

    // Jackson ObjectMapper for JSON conversion
    private final ObjectMapper objectMapper;

    @Autowired // Inject ObjectMapper (Spring Boot usually configures one automatically)
    public LifestyleRecTemplateService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }


    @PostConstruct
    public void init() {
        loadAllTemplateFiles();
    }

    /**
     * Generates an initial JSON string representing lifestyle recommendations
     * for the specified template ID and panel names.
     *
     * @param templateId The ID corresponding to the template file (e.g., parent ID).
     * @param panelNames The set of panel/sheet names to include (e.g., "Blood", "Metabolism").
     * @return A JSON string (e.g., "[{\"panelName\":\"Blood\", \"items\":[{\"Aspect\":\"...\", \"What to Do\":\"...\"}]}]"),
     * or an empty JSON array "[]" if no data is found or panels are empty.
     * @throws RuntimeException if JSON serialization fails.
     */
    public String generateInitialJsonForPanels(Integer templateId, Set<String> panelNames) {
        if (panelNames == null || panelNames.isEmpty()) {
            LoggingUtils.logWarn(logger, "generateInitialJsonForPanels called with empty panel names for template ID {}. Returning empty JSON array.", templateId);
            return "[]";
        }

        Map<String, List<LifestyleRecommendationItemData>> templatePanels = templateDataMap.get(templateId);
        if (templatePanels == null || templatePanels.isEmpty()) {
            LoggingUtils.logWarn(logger, "No template data found in memory for template ID {}. Returning empty JSON array.", templateId);
            return "[]";
        }

        List<Map<String, Object>> resultPanels = new ArrayList<>();

        for (String panelName : panelNames) {
            List<LifestyleRecommendationItemData> itemsData = templatePanels.getOrDefault(panelName, Collections.emptyList());

            if (!itemsData.isEmpty()) {
                Map<String, Object> panelMap = new LinkedHashMap<>(); // Use LinkedHashMap to preserve insertion order
                panelMap.put("panelName", panelName);
                // Convert List<LifestyleRecommendationItemData> to List<Map<String, String>>
                List<Map<String, String>> itemMaps = itemsData.stream()
                        .map(LifestyleRecommendationItemData::getAttributes)
                        .collect(Collectors.toList());
                panelMap.put("items", itemMaps);
                resultPanels.add(panelMap);
            } else {
                LoggingUtils.logDebug(logger, "No items found for panel '{}' in template ID {}. Skipping panel in JSON output.", panelName, templateId);
            }
        }

        try {
            // Serialize the list of panels to a JSON array string
            String jsonResult = objectMapper.writeValueAsString(resultPanels);
            LoggingUtils.logInfo(logger, "Generated initial JSON for template ID {} and panels {}: {}", templateId, panelNames, jsonResult);
            return jsonResult;
        } catch (JsonProcessingException e) {
            LoggingUtils.logError(logger, "Failed to serialize recommendation data to JSON for template ID {}: {}", templateId, e.getMessage(), e);
            // Depending on desired behavior, you could return "[]" or throw a runtime exception
            throw new RuntimeException("Error generating recommendation JSON: " + e.getMessage(), e);
        }
    }


    // --- Internal Loading Logic ---

    /**
     * Loads data from all matching XLSX files in the template folder.
     */
    private void loadAllTemplateFiles() {
        File folder = new File(templateFolderPath);
        if (!folder.exists() || !folder.isDirectory()) {
            LoggingUtils.logError(logger, "Lifestyle recommendation template folder path is invalid: {}", templateFolderPath);
            return;
        }
        File[] templateFiles = folder.listFiles((dir, name) -> FILENAME_PATTERN.matcher(name).matches());
        if (templateFiles == null || templateFiles.length == 0) {
            LoggingUtils.logWarn(logger, "No lifestyle recommendation template files found matching pattern in: {}", templateFolderPath);
            return;
        }
        for (File templateFile : templateFiles) {
            loadTemplateDataFromFile(templateFile);
        }
        LoggingUtils.logInfo(logger, "Finished loading all lifestyle recommendation template files.");
    }

    /**
     * Loads data from the relevant sheets within a single XLSX template file.
     */
    private void loadTemplateDataFromFile(File templateFile) {
        Optional<Integer> templateIdOpt = extractIdFromFilename(templateFile.getName());
        if (templateIdOpt.isEmpty()) {
            LoggingUtils.logWarn(logger, "Skipping file (could not extract ID): {}", templateFile.getName());
            return;
        }
        int templateId = templateIdOpt.get();
        Map<String, List<LifestyleRecommendationItemData>> panelDataMap = new HashMap<>();

        try (FileInputStream fis = new FileInputStream(templateFile);
             Workbook workbook = WorkbookFactory.create(fis)) {

            for (String sheetName : RELEVANT_SHEET_NAMES) {
                Sheet sheet = workbook.getSheet(sheetName);
                if (sheet == null) {
                    // logger.debug("Sheet '{}' not found in file '{}'. Skipping sheet.", sheetName, templateFile.getName());
                    continue; // Silently skip missing sheets relevant to this template
                }
                List<LifestyleRecommendationItemData> items = parseExcelSheet(sheet, sheetName, templateFile.getName());
                if (!items.isEmpty()) {
                    panelDataMap.put(sheetName, items);
                    LoggingUtils.logInfo(logger, "Loaded {} items from sheet '{}' in file '{}' for template ID {}",
                            items.size(), sheetName, templateFile.getName(), templateId);
                } else {
                    // logger.debug("No valid items parsed from sheet '{}' in file '{}'", sheetName, templateFile.getName());
                }
            }
        } catch (IOException e) {
            LoggingUtils.logError(logger, "Failed to read or process Excel file: {}", templateFile.getName(), e);
            return;
        } catch (Exception e) {
            LoggingUtils.logError(logger, "An unexpected error occurred while processing file: {}", templateFile.getName(), e);
            return;
        }

        if (!panelDataMap.isEmpty()) {
            templateDataMap.put(templateId, panelDataMap);
            LoggingUtils.logInfo(logger, "Successfully stored template data for ID {} from file {}", templateId, templateFile.getName());
        } else {
            LoggingUtils.logWarn(logger, "No relevant panel/sheet data loaded for template ID {} from file {}", templateId, templateFile.getName());
        }
    }

    /**
     * Parses a single Excel sheet containing recommendation items.
     * Reads the header row dynamically to determine attribute keys.
     *
     * @param sheet       The Apache POI Sheet object to parse.
     * @param sheetName   The name of the sheet (for logging).
     * @param fileName    The name of the source file (for logging).
     * @return A list of LifestyleRecommendationItemData parsed from the sheet.
     */
    private List<LifestyleRecommendationItemData> parseExcelSheet(Sheet sheet, String sheetName, String fileName) {
        List<LifestyleRecommendationItemData> items = new ArrayList<>();
        DataFormatter dataFormatter = new DataFormatter();

        // 1. Find Header Row and Map Column Indices to Header Names
        Row headerRow = sheet.getRow(0);
        if (headerRow == null || headerRow.getLastCellNum() <= 0) {
            LoggingUtils.logWarn(logger, "Sheet '{}' in file '{}' is empty or has no header row.", sheetName, fileName);
            return items;
        }

        Map<Integer, String> headerMap = new HashMap<>();
        for (Cell cell : headerRow) {
            if (cell != null) {
                String headerText = dataFormatter.formatCellValue(cell).trim();
                if (!headerText.isEmpty()) {
                    headerMap.put(cell.getColumnIndex(), headerText);
                }
            }
        }

        if (headerMap.isEmpty()) {
            LoggingUtils.logWarn(logger, "Could not find any valid headers in sheet '{}' of file '{}'.", sheetName, fileName);
            return items;
        }

        // 2. Iterate through data rows (starting from row 1, after the header)
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) {
                continue; // Skip empty rows
            }

            Map<String, String> attributes = new LinkedHashMap<>(); // Use LinkedHashMap to maintain column order
            boolean rowHasData = false;
            for (Map.Entry<Integer, String> headerEntry : headerMap.entrySet()) {
                int colIndex = headerEntry.getKey();
                String headerName = headerEntry.getValue();
                Cell cell = row.getCell(colIndex);
                String cellValue = dataFormatter.formatCellValue(cell).trim(); // Get value, trim whitespace
                attributes.put(headerName, cellValue);
                if(!cellValue.isEmpty()) {
                    rowHasData = true; // Consider row non-empty if any cell has data
                }
            }

            // Only add item if the row had some data
            if (rowHasData) {
                items.add(new LifestyleRecommendationItemData(attributes));
            } else {
                // logger.debug("Skipping empty data row {} in sheet '{}'", i + 1, sheetName);
            }
        }

        return items;
    }

    /**
     * Extracts the template ID from a filename like "lifestyle_recommendations_1.xlsx".
     */
    private Optional<Integer> extractIdFromFilename(String filename) {
        Matcher matcher = FILENAME_PATTERN.matcher(filename);
        if (matcher.matches()) {
            try {
                return Optional.of(Integer.parseInt(matcher.group(1)));
            } catch (NumberFormatException e) {
                LoggingUtils.logError(logger, "Could not parse ID from filename '{}'", filename, e);
            }
        }
        return Optional.empty();
    }


    /**
     * Inner class to hold parsed attribute data from an Excel row temporarily.
     */
    public static class LifestyleRecommendationItemData {
        // Stores attributes dynamically based on Excel headers
        private final Map<String, String> attributes;

        public LifestyleRecommendationItemData(Map<String, String> attributes) {
            // Use defensive copy if map might be modified elsewhere, otherwise direct assignment is fine.
            this.attributes = new LinkedHashMap<>(attributes); // Keep column order
        }

        // Getter for the service layer (e.g., for JSON generation)
        public Map<String, String> getAttributes() {
            return attributes;
        }

        // Removed: getAspect(), getWhatToDo(), getWhyItMatters()
    }

    /**
     * Retrieves the raw parsed template data for a specific template ID and panel name.
     * Used internally for constructing the JSON.
     *
     * @param templateId The ID corresponding to the template file (e.g., parent ID).
     * @param panelName  The name of the panel/sheet (e.g., "Blood", "Metabolism").
     * @return A list of LifestyleRecommendationItemData (each containing an attribute map), or an empty list if not found.
     */
    private List<LifestyleRecommendationItemData> getTemplateData(Integer templateId, String panelName) {
        return Optional.ofNullable(templateDataMap.get(templateId))
                .map(panels -> panels.getOrDefault(panelName, Collections.emptyList()))
                .orElse(Collections.emptyList());
    }
}