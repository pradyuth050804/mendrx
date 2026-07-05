package com.mendrx.backend.service;

import com.mendrx.backend.enums.BloodMarkerResultEnum;
import com.mendrx.backend.enums.DietEnum;
import com.mendrx.backend.enums.ExistingConditionEnum;
import com.mendrx.backend.enums.LifeStyleHabitEnum;
import com.mendrx.backend.model.Client;
import com.mendrx.backend.model.Report;
import com.mendrx.backend.model.User;
import com.mendrx.backend.model.response.CompanionReportDTO;
import com.mendrx.backend.model.response.ReportMetadataResponseModel;
import com.mendrx.backend.model.shared.BloodMarker;
import com.mendrx.backend.model.shared.ParameterInfo;
import com.mendrx.backend.repository.ReportRepository;
import com.mendrx.backend.util.DerivedMarkersCalculator;
import com.mendrx.backend.util.TrackerData;
import com.mendrx.backend.util.converter.BloodPanelUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private static final Logger logger = LoggerFactory.getLogger(ReportService.class);

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private SupabaseVaultService vaultService;

    @Autowired
    private MultiTrackerFileService multiTrackerFileService;

    @Transactional
    public Report saveReport(Report report) {
        // Encrypt and save
        if (report.getBloodMarkers() != null) {
            report.setBloodMarkersEncrypted(
                    vaultService.encryptBloodMarkers(report.getBloodMarkers())
            );
        }
        if (report.getNotes() != null) {
            report.setNotesEncrypted(
                    vaultService.encryptNotes(report.getNotes())
            );
        }
        if (report.getClientHistory() != null) {
            report.setClientHistoryEncrypted(vaultService.encryptClientHistory(report.getClientHistory()));
        }
        if (report.getDietConfig() != null) {
            report.setDietConfigEncrypted(vaultService.encryptDietConfig(report.getDietConfig()));
        }
        reportRepository.save(report);
        return report;
    }

    @Transactional(readOnly = true)
    public Report getReportForUser(UUID reportId) {
        Report report = reportRepository.findById(reportId).orElse(null);
        if (report != null) {
            decryptReportData(report);
            if(report.getWeight()!=null && report.getHeight()!=null) {
                report.setBmi(DerivedMarkersCalculator.calculateBMI(report.getWeight(), (double) report.getHeight() /100));
            }
        }
        return report;
    }

    @Transactional(readOnly = true)
    public boolean getReportExists(UUID reportId) {
        return reportRepository.existsById(reportId);
    }

    @Transactional
    public Report createReport(User user, Client client, LocalDateTime reportDate, Integer height, Double weight, Double waist, String diet, List<String> lifestyleHabits, List<String> existingConditions, String clientHistory) {
        Report report = new Report();
        report.setUser(user);
        report.setClient(client);
        report.setReportDate(reportDate);
        if (height != null) {
            report.setHeight(height);
        }
        if (weight != null) {
            report.setWeight(weight);
        }
        if (waist != null) {
            report.setWaist(waist);
        }
        if (clientHistory != null) {
            report.setClientHistory(clientHistory);
        }
        if (diet != null && !diet.isEmpty()) {
            try {
                report.setDiet(DietEnum.valueOf(diet.toUpperCase()));
            } catch (IllegalArgumentException e) {
                // Handle invalid diet
                report.setDiet(DietEnum.VEGETARIAN);
            }
        }
        if (lifestyleHabits != null && !lifestyleHabits.isEmpty()) {
            Set<LifeStyleHabitEnum> habits = lifestyleHabits.stream()
                    .map(this::parseLifeStyleHabit)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            report.setLifestyleHabits(habits);
        }

        if (existingConditions != null && !existingConditions.isEmpty()) {
            Set<ExistingConditionEnum> conditions = existingConditions.stream()
                    .map(this::parseExistingCondition)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            report.setExistingConditions(conditions);
        }
        report.setMigrationDone(true);
        return saveReport(report);
    }

    private LifeStyleHabitEnum parseLifeStyleHabit(String habit) {
        try {
            return LifeStyleHabitEnum.valueOf(habit.toUpperCase().replace(" ", "_"));
        } catch (IllegalArgumentException e) {
            // Log the error or handle it as needed
            System.err.println("Invalid lifestyle habit: " + habit);
            return null;
        }
    }

    private ExistingConditionEnum parseExistingCondition(String condition) {
        try {
            return ExistingConditionEnum.valueOf(condition.toUpperCase().replace(" ", "_").replace("/","_"));
        } catch (IllegalArgumentException e) {
            // Log the error or handle it as needed
            System.err.println("Invalid existing condition: " + condition);
            return null;
        }
    }

    public void updateBloodMarkerReason(Report report, String parameterName, String newReason) {
        // First decrypt if not already decrypted
        if (report.getBloodMarkers() == null && report.getBloodMarkersEncrypted() != null) {
            report.setBloodMarkers(
                    vaultService.decryptBloodMarkers(report.getBloodMarkersEncrypted())
            );
        }

        List<BloodMarker> bloodMarkers = report.getBloodMarkers();
        if (bloodMarkers != null) {
            for (BloodMarker marker : bloodMarkers) {
                if (marker.getParameterName().equals(parameterName)) {
                    marker.setReason(newReason);
                    break;
                }
            }
            report.setBloodMarkers(bloodMarkers);
        }
        saveReport(report);
    }

    @Transactional(readOnly = true)
    public Page<ReportMetadataResponseModel> getUserReportMetadata(UUID userAuthId, Pageable pageable) {
        return reportRepository.findReportMetadataByUserId(userAuthId, pageable).map(projection -> {
            Integer ageOnReportDate = calculateAgeOnReportDate(
                    YearMonth.parse(projection.getBirthMonth()),
                    projection.getReportDate()
            );

            return new ReportMetadataResponseModel(
                    projection.getId(),
                    projection.getClientId(),
                    projection.getClientName(),
                    projection.getGender(),
                    projection.getReportDate(),
                    projection.getUpdatedAt(),
                    ageOnReportDate
            );
        });
    }

    @Transactional(readOnly = true)
    public Page<ReportMetadataResponseModel> getUserReportMetadataByClientSearch(
            UUID userAuthId, String searchTerm, Pageable pageable) {
        return reportRepository.findByUserIdAndClientSearch(userAuthId, searchTerm, pageable).map(projection -> {
            Integer ageOnReportDate = calculateAgeOnReportDate(
                    YearMonth.parse(projection.getBirthMonth()),
                    projection.getReportDate()
            );

            return new ReportMetadataResponseModel(
                    projection.getId(),
                    projection.getClientId(),
                    projection.getClientName(),
                    projection.getGender(),
                    projection.getReportDate(),
                    projection.getUpdatedAt(),
                    ageOnReportDate
            );
        });
    }



    //@Transactional(readOnly = true)
    @Transactional
    public Report getDetailedReport(UUID reportId, UUID userAuthId) {
        Report report = reportRepository.findById(reportId).orElse(null);

        if (report == null || !report.getUser().getAuthId().equals(userAuthId)) {
            return null;
        }

        decryptReportData(report);
        if(!report.getMigrationDone()) {
            report = migrateReport(report);
        }
        enrichReportWithParameterDetails(report);

        if (report.getBloodMarkers() != null && !report.getBloodMarkers().isEmpty()) {
            report.setBloodPanelListMap(BloodPanelUtils.constructBloodPanelListMap(report.getBloodMarkers()));
        }

        if(report.getWeight()!=null && report.getHeight()!=null) {
            report.setBmi(DerivedMarkersCalculator.calculateBMI(report.getWeight(), (double) report.getHeight() /100));
        }

        return report;
    }

    @Transactional
    public CompanionReportDTO getCompanionReport(UUID reportId) {
        Report report = reportRepository.findById(reportId).orElse(null);

        if (report == null) {
            return null;
        }

        decryptReportData(report);
        if(!report.getMigrationDone()) {
            report = migrateReport(report);
        }
        enrichReportWithParameterDetails(report);

        if (report.getBloodMarkers() != null && !report.getBloodMarkers().isEmpty()) {
            report.setBloodPanelListMap(BloodPanelUtils.constructBloodPanelListMap(report.getBloodMarkers()));
        }

        if(report.getWeight()!=null && report.getHeight()!=null) {
            report.setBmi(DerivedMarkersCalculator.calculateBMI(report.getWeight(), (double) report.getHeight() /100));
        }

        return new CompanionReportDTO(report);
    }

    private Report migrateReport(Report report) {
        if (report.getBloodMarkers() != null) {
            for (BloodMarker marker : report.getBloodMarkers()) {
                if(BloodMarkerResultEnum.NORMAL.equals(marker.getResult())) {
                    marker.setResult(BloodMarkerResultEnum.OPTIMAL);
                }
            }
        }
        report.setMigrationDone(true);
        return saveReport(report);
    }

    private void decryptReportData(Report report) {
        if (report.getBloodMarkersEncrypted() != null) {
            report.setBloodMarkers(
                    vaultService.decryptBloodMarkers(report.getBloodMarkersEncrypted())
            );
        }
        if (report.getNotesEncrypted() != null) {
            report.setNotes(
                    vaultService.decryptNotes(report.getNotesEncrypted())
            );
        }
        if(report.getClientHistoryEncrypted() != null) {
            report.setClientHistory(vaultService.decryptClientHistory(report.getClientHistoryEncrypted()));
        }
        if (report.getDietConfigEncrypted() != null) {
            report.setDietConfig(vaultService.decryptDietConfig(report.getDietConfigEncrypted()));
        }
    }

    @Transactional
    public void saveDietConfig(UUID reportId, String dietConfigJson) {
        Report report = reportRepository.findById(reportId).orElse(null);
        if (report != null) {
            report.setDietConfig(dietConfigJson);
            report.setDietConfigEncrypted(vaultService.encryptDietConfig(dietConfigJson));
            reportRepository.save(report);
        }
    }

    private void enrichReportWithParameterDetails(Report report) {
        if (report.getBloodMarkers() == null) {
            return;
        }

        Map<String, ParameterInfo> optimalValues;

        TrackerData trackerData = multiTrackerFileService.getTrackerData(report.getUser().getParent().getId());

        // Select gender-specific optimal values
        if ("MALE".equalsIgnoreCase(report.getGender())) {
            optimalValues = trackerData.getMaleData();
        } else {
            optimalValues = trackerData.getFemaleData();
        }

        // Enrich each blood marker with parameter details
        for (BloodMarker marker : report.getBloodMarkers()) {
            String parameterName = marker.getParameterName();

            // Set optimal values based on gender
            if (optimalValues.containsKey(parameterName)) {
                marker.setParameterInfo(optimalValues.get(parameterName));
            }

        }
    }

    @Transactional
    public boolean updateNotes(UUID reportId, UUID userAuthId, String notes) {
        byte[] encryptedNotes = vaultService.encryptNotes(notes);
        int updatedCount = reportRepository.updateNotesEncrypted(
                reportId,
                userAuthId,
                encryptedNotes,
                LocalDateTime.now()
        );
        return updatedCount > 0;
    }

    @Transactional
    public void deleteReports(List<UUID> reportIds, UUID userAuthId) {
        reportRepository.deleteByIdInAndUserId(reportIds, userAuthId);
    }

    private Integer calculateAgeOnReportDate(YearMonth birthMonth, LocalDateTime reportDate) {
        if (birthMonth == null || reportDate == null) {
            return null;
        }

        YearMonth reportMonth = YearMonth.from(reportDate);
        int years = reportMonth.getYear() - birthMonth.getYear();

        if (reportMonth.getMonth().getValue() < birthMonth.getMonth().getValue()) {
            years--;
        }

        return years;
    }

    public User getUserForReport(UUID reportId) {
        return reportRepository.findUserByReportId(reportId).orElse(null);
    }
}
