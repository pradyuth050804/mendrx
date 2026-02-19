package com.mendrx.backend.service;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardWatchEventKinds;
import java.nio.file.WatchEvent;
import java.nio.file.WatchKey;
import java.nio.file.WatchService;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.annotation.PostConstruct;

import com.mendrx.backend.util.LoggingUtils;
import com.mendrx.backend.util.TrackerData;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.mendrx.backend.model.shared.ParameterInfo;


@Service
public class MultiTrackerFileService {

    private static final Logger logger = LoggerFactory.getLogger(MultiTrackerFileService.class);

    @Value("${tracker.folder.path}")
    private String trackerFolderPath; // The folder containing tracker_1.xlsx, tracker_2.xlsx, etc.

    // Stores data for each ID -> TrackerData
    private final Map<Integer, TrackerData> trackerDataMap = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        loadAllTrackerFiles();
        startDirectoryWatcher();
    }

    /**
     * Called to retrieve the data for a specific tracker ID, e.g. 1 or 2.
     */
    public TrackerData getTrackerData(Integer id) {
        return trackerDataMap.get(id);
    }

    /**
     * Loads ALL files in the folder that match a pattern (e.g., tracker_#.xlsx)
     */
    private void loadAllTrackerFiles() {
        File folder = new File(trackerFolderPath);
        if (!folder.exists() || !folder.isDirectory()) {
            LoggingUtils.logError(logger, "Tracker folder path is invalid: {}", trackerFolderPath);
            return;
        }

        File[] xlsxFiles = folder.listFiles((dir, name) -> name.matches("tracker_\\d+\\.xlsx"));
        if (xlsxFiles == null) {
            LoggingUtils.logWarn(logger, "No tracker files found in: {}", trackerFolderPath);
            return;
        }

        for (File file : xlsxFiles) {
            loadSingleTrackerFile(file);
        }
    }

    /**
     * Loads a SINGLE file and puts it into the trackerDataMap
     */
    private void loadSingleTrackerFile(File file) {
        // Extract ID from filename. For example, if file is "tracker_2.xlsx", ID would be 2
        Integer trackerId = extractIdFromFilename(file.getName());
        if (trackerId == null) {
            LoggingUtils.logWarn(logger, "Skipping file (can't parse ID): {}", file.getName());
            return;
        }

        // Parse the file, build up new data structures:
        Map<String, ParameterInfo> newMaleData = new HashMap<>();
        Map<String, ParameterInfo> newFemaleData = new HashMap<>();
        Map<String, ParameterDetails> newDetailedData = new HashMap<>();
        Map<String, String> newDysfunctionData = new HashMap<>();
        Map<String, String> newParamLowComments = new HashMap<>();
        Map<String, String> newParamHighComments = new HashMap<>();

        try (FileInputStream fis = new FileInputStream(file);
             Workbook workbook = WorkbookFactory.create(fis)) {

            loadORSheetData(workbook, newMaleData, newFemaleData);
            loadDMSheetData(workbook, newDetailedData);
            loadDysfunctionData(workbook, newDysfunctionData);
            loadSTSheetData(workbook, newParamHighComments, newParamLowComments);

            LoggingUtils.logInfo(logger, "Loaded Excel data for tracker ID {} from: {}", trackerId, file.getName());
        } catch (IOException e) {
            LoggingUtils.logError(logger, "Failed to load tracker file: {}", file.getName(), e);
            return;
        }

        // Wrap data into a new TrackerData
        TrackerData trackerData = new TrackerData(
                newMaleData,
                newFemaleData,
                newDetailedData,
                newDysfunctionData,
                newParamLowComments,
                newParamHighComments
        );

        // Put into the map
        trackerDataMap.put(trackerId, trackerData);
    }

    /**
     * Extracts the ID from a file name like "tracker_2.xlsx" -> 2
     */
    private Integer extractIdFromFilename(String filename) {
        try {
            // e.g. "tracker_2.xlsx" -> ["tracker", "2.xlsx"]
            String numberPart = filename.split("_")[1].replaceAll("\\D+", "");
            return Integer.parseInt(numberPart);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Implementation of your existing methods, but note how we pass in the target data structures
     * (rather than using static fields).
     */
    private void loadORSheetData(Workbook workbook,
                                 Map<String, ParameterInfo> maleData,
                                 Map<String, ParameterInfo> femaleData) {
        Sheet sheet = workbook.getSheet("OR");
        if (sheet == null) return;
        int successCount = 0;
        int totalRows = Math.min(sheet.getLastRowNum(), 199);
        
        for (int i = 1; i <= totalRows; i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            try {
                // Check only absolutely required cells
                if (row.getCell(0) == null || row.getCell(6) == null || row.getCell(10) == null || row.getCell(11) == null) {
                    StringBuilder missingCells = new StringBuilder();
                    if (row.getCell(0) == null) missingCells.append("0(parameterName), ");
                    if (row.getCell(6) == null) missingCells.append("6(panelName), ");
                    if (row.getCell(10) == null) missingCells.append("10(isPrimary), ");
                    if (row.getCell(11) == null) missingCells.append("11(calibration), ");
                    
                    String missing = missingCells.toString();
                    if (missing.endsWith(", ")) {
                        missing = missing.substring(0, missing.length() - 2);
                    }
                    LoggingUtils.logWarn(logger, "Skipping row {} due to missing required cells: {}", i, missing);
                    continue;
                }

                String parameterName = row.getCell(0).getStringCellValue();
                if (parameterName == null || parameterName.trim().isEmpty()) {
                    LoggingUtils.logWarn(logger, "Skipping row {} due to empty parameter name", i);
                    continue;
                }

                // Check if we have at least one set of values (male or female)
                boolean hasMaleData = row.getCell(1) != null && row.getCell(2) != null;
                boolean hasFemaleData = row.getCell(3) != null && row.getCell(4) != null;
                
                if (!hasMaleData && !hasFemaleData) {
                    LoggingUtils.logWarn(logger, "Skipping row {} - no male or female data present", i);
                    continue;
                }

                // Read values with defaults for missing data
                double maleMin = hasMaleData ? row.getCell(1).getNumericCellValue() : 0.0;
                double maleMax = hasMaleData ? row.getCell(2).getNumericCellValue() : 0.0;
                double femaleMin = hasFemaleData ? row.getCell(3).getNumericCellValue() : 0.0;
                double femaleMax = hasFemaleData ? row.getCell(4).getNumericCellValue() : 0.0;

                // Standard values with defaults
                double standardMaleMin = (row.getCell(14) != null) ? row.getCell(14).getNumericCellValue() : maleMin;
                double standardMaleMax = (row.getCell(15) != null) ? row.getCell(15).getNumericCellValue() : maleMax;
                double standardFemaleMin = (row.getCell(16) != null) ? row.getCell(16).getNumericCellValue() : femaleMin;
                double standardFemaleMax = (row.getCell(17) != null) ? row.getCell(17).getNumericCellValue() : femaleMax;

                String panelName = row.getCell(6).getStringCellValue();
                String shortDesc = (row.getCell(9) != null) ? row.getCell(9).getStringCellValue() : "";
                Boolean isPrimary = "Primary".equals(row.getCell(10).getStringCellValue());
                double calibration = row.getCell(11).getNumericCellValue();

                // Only add data that exists
                if (hasMaleData) {
                    maleData.put(parameterName, new ParameterInfo(maleMin, maleMax, standardMaleMin, standardMaleMax, shortDesc, panelName, isPrimary, calibration));
                }
                if (hasFemaleData) {
                    femaleData.put(parameterName, new ParameterInfo(femaleMin, femaleMax, standardFemaleMin, standardFemaleMax, shortDesc, panelName, isPrimary, calibration));
                }
                
                successCount++;
                
                // Log details for rows around 130-136 to compare
                if (i >= 130 && i <= 136) {
                    LoggingUtils.logInfo(logger, "Successfully parsed row {}: parameter={}, panelName={}, isPrimary={}", 
                        i, parameterName, panelName, isPrimary);
                }
            } catch (Exception e) {
                // logging omitted for brevity
            }
        }
        LoggingUtils.logInfo(logger, "Successfully parsed {} rows out of {} total rows in OR sheet", successCount, totalRows);
    }

    private void loadDMSheetData(Workbook workbook,
                                 Map<String, ParameterDetails> detailedData) {
        Sheet sheet = workbook.getSheet("DM");
        if (sheet == null) return;
        for (int i = 1; i <= sheet.getLastRowNum() && i < 200; i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            try {
                String parameterName = row.getCell(0).getStringCellValue();
                String high = row.getCell(1).getStringCellValue();
                String low = row.getCell(2).getStringCellValue();

                detailedData.put(parameterName, new ParameterDetails(low, high, null, null));
            } catch (Exception e) {
                // logging omitted for brevity
            }
        }
    }

    private void loadDysfunctionData(Workbook workbook,
                                     Map<String, String> dysfunctionDataMap) {
        Sheet sheet = workbook.getSheet("DF");
        if (sheet == null) return;
        for (int i = 1; i <= sheet.getLastRowNum() && i < 300; i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            try {
                String dysfunctionName = row.getCell(0).getStringCellValue();
                String parameters = row.getCell(1).getStringCellValue();
                dysfunctionDataMap.put(dysfunctionName, parameters);
            } catch (Exception e) {
                // logging omitted for brevity
            }
        }
    }

    private void loadSTSheetData(Workbook workbook,
                                 Map<String, String> paramHighComments,
                                 Map<String, String> paramLowComments) {
        Sheet sheet = workbook.getSheet("ST");
        if (sheet == null) return;
        for (int i = 1; i <= sheet.getLastRowNum() && i < 200; i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            try {
                String parameterName = row.getCell(0).getStringCellValue();
                String high = row.getCell(1).getStringCellValue();
                String low = row.getCell(2).getStringCellValue();

                paramHighComments.put(parameterName, high);
                paramLowComments.put(parameterName, low);
            } catch (Exception e) {
                // logging omitted for brevity
            }
        }
    }

    /**
     * Watches the entire directory for file changes, so that if e.g. tracker_2.xlsx changes,
     * we reload that file. (You could also do a "reload all" approach if you prefer.)
     */
    private void startDirectoryWatcher() {
        Thread watcherThread = new Thread(() -> {
            try {
                WatchService watchService = FileSystems.getDefault().newWatchService();
                Path folderPath = Paths.get(trackerFolderPath);

                folderPath.register(watchService,
                        StandardWatchEventKinds.ENTRY_MODIFY,
                        StandardWatchEventKinds.ENTRY_CREATE,
                        StandardWatchEventKinds.ENTRY_DELETE);

                while (!Thread.currentThread().isInterrupted()) {
                    WatchKey key = watchService.take();
                    for (WatchEvent<?> event : key.pollEvents()) {
                        if (event.kind() == StandardWatchEventKinds.OVERFLOW) {
                            continue;
                        }

                        Path changedFileName = (Path) event.context();
                        // e.g., "tracker_2.xlsx"
                        File changedFile = folderPath.resolve(changedFileName).toFile();

                        if (changedFile.getName().matches("tracker_\\d+\\.xlsx")) {
                            // If file was deleted, remove from map
                            if (event.kind() == StandardWatchEventKinds.ENTRY_DELETE) {
                                Integer removedId = extractIdFromFilename(changedFile.getName());
                                if (removedId != null) {
                                    trackerDataMap.remove(removedId);
                                    LoggingUtils.logInfo(logger, "Removed data for ID {} (file deleted).", removedId);
                                }
                            } else {
                                // Create or Modify => load
                                loadSingleTrackerFile(changedFile);
                            }
                        }
                    }
                    key.reset();
                }
            } catch (IOException | InterruptedException e) {
                LoggingUtils.logError(logger, "Directory watcher interrupted", e);
                Thread.currentThread().interrupt();
            }
        });

        watcherThread.setDaemon(true);
        watcherThread.start();
    }

    public static class ParameterDetails {
        private final String lowReason;
        private final String highReason;
        private final String lowComments;
        private final String highComments;

        public ParameterDetails(String lowReason, String highReason, String lowComments, String highComments) {
            this.lowReason = lowReason;
            this.highReason = highReason;
            this.lowComments = lowComments;
            this.highComments = highComments;
        }

        public String getLowReason() {
            return lowReason;
        }

        public String getHighReason() {
            return highReason;
        }

        public String getLowComments() {
            return lowComments;
        }

        public String getHighComments() {
            return highComments;
        }

        @Override
        public String toString() {
            return "Low: " + lowReason + ", High: " + highReason +
                    ", Low Comments: " + lowComments + ", High Comments: " + highComments;
        }
    }
}

