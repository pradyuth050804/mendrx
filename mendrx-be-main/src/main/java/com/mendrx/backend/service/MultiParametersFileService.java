package com.mendrx.backend.service;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.annotation.PostConstruct;

import com.mendrx.backend.util.ParametersData;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class MultiParametersFileService {

    private static final Logger logger = LoggerFactory.getLogger(MultiParametersFileService.class);

    @Value("${parameters.folder.path}")
    private String parametersFolderPath;
    // e.g., "path/to/folder" which contains parameters_1.csv, parameters_2.csv, etc.

    // Key: ID (e.g. 1 for parameters_1.csv), Value: parsed CSV data
    private final Map<Integer, ParametersData> parametersDataMap = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        loadAllParameterFiles();
        startDirectoryWatcher();
    }

    /**
     * Returns the data (units map and raw file content) for a given ID, or null if not found.
     */
    public ParametersData getParametersData(int id) {
        return parametersDataMap.get(id);
    }

    /**
     * Loads all CSV files in the folder matching the pattern "parameters_#.csv".
     */
    private void loadAllParameterFiles() {
        File folder = new File(parametersFolderPath);
        if (!folder.exists() || !folder.isDirectory()) {
            LoggingUtils.logError(logger, "Parameters folder path is invalid: {}", parametersFolderPath);
            return;
        }

        File[] csvFiles = folder.listFiles((dir, name) -> name.matches("parameters_\\d+\\.csv"));
        if (csvFiles == null || csvFiles.length == 0) {
            LoggingUtils.logWarn(logger, "No parameters_#.csv files found in folder: {}", parametersFolderPath);
            return;
        }

        for (File file : csvFiles) {
            loadSingleParameterFile(file);
        }
    }

    /**
     * Loads one CSV file and stores the result in the map.
     */
    private void loadSingleParameterFile(File file) {
        Integer fileId = extractIdFromFilename(file.getName());
        if (fileId == null) {
            LoggingUtils.logWarn(logger, "Could not parse ID from file name: {}. Skipping.", file.getName());
            return;
        }

        try {
            // Read entire file into a String (fileContent)
            String fileContent = Files.readString(file.toPath());

            // Build the map of parameterUnits
            Map<String, String> newParameterUnits = new HashMap<>();
            try (BufferedReader reader = Files.newBufferedReader(file.toPath())) {
                String line;
                boolean skipHeader = true;
                while ((line = reader.readLine()) != null) {
                    // Skip the header line if present
                    if (skipHeader) {
                        skipHeader = false;
                        continue;
                    }
                    String[] parts = line.split(",");
                    if (parts.length >= 1) {
                        String parameterName = parts[0].trim();
                        String unit = (parts.length > 1) ? parts[1].trim() : "";
                        if (unit.isEmpty()) {
                            unit = "NO_UNIT";
                        }
                        newParameterUnits.put(parameterName, unit);
                    }
                }
            }

            // Create a new container object
            ParametersData data = new ParametersData(newParameterUnits, fileContent);

            // Store in the map
            parametersDataMap.put(fileId, data);

            LoggingUtils.logInfo(logger, "Successfully loaded parameters CSV for ID {} from: {}",
                    fileId, file.getName());
        } catch (IOException e) {
            LoggingUtils.logError(logger, "Error reading CSV file: {}", file.getName(), e);
        }
    }

    /**
     * Extracts the ID from a file name like "parameters_2.csv" -> 2
     */
    private Integer extractIdFromFilename(String filename) {
        try {
            // Split on underscore: "parameters_2.csv" => ["parameters", "2.csv"]
            String numberPart = filename.split("_")[1].replaceAll("\\D+", "");
            return Integer.valueOf(numberPart);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Watches the entire directory. If a matching file is created/modified/deleted,
     * update parametersDataMap accordingly.
     */
    private void startDirectoryWatcher() {
        Thread watcherThread = new Thread(() -> {
            try {
                WatchService watchService = FileSystems.getDefault().newWatchService();
                Path folderPath = Paths.get(parametersFolderPath);

                folderPath.register(watchService,
                        StandardWatchEventKinds.ENTRY_CREATE,
                        StandardWatchEventKinds.ENTRY_MODIFY,
                        StandardWatchEventKinds.ENTRY_DELETE);

                while (!Thread.currentThread().isInterrupted()) {
                    WatchKey key = watchService.take();
                    for (WatchEvent<?> event : key.pollEvents()) {
                        if (event.kind() == StandardWatchEventKinds.OVERFLOW) {
                            continue;
                        }

                        Path changedFileName = (Path) event.context();
                        File changedFile = folderPath.resolve(changedFileName).toFile();

                        // Match pattern "parameters_\\d+\\.csv"
                        if (changedFile.getName().matches("parameters_\\d+\\.csv")) {
                            if (event.kind() == StandardWatchEventKinds.ENTRY_DELETE) {
                                // Remove entry from map if the file was deleted
                                Integer removedId = extractIdFromFilename(changedFile.getName());
                                if (removedId != null) {
                                    parametersDataMap.remove(removedId);
                                    LoggingUtils.logInfo(logger, "Removed parameters data for ID {} (file deleted).", removedId);
                                }
                            } else {
                                // Either created or modified => re-load
                                loadSingleParameterFile(changedFile);
                            }
                        }
                    }
                    // Important to reset the key to allow further watch events
                    key.reset();
                }
            } catch (IOException | InterruptedException e) {
                LoggingUtils.logError(logger, "Directory watcher for parameters folder interrupted", e);
                Thread.currentThread().interrupt();
            }
        });

        watcherThread.setDaemon(true);
        watcherThread.start();
    }
}

