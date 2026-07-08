package com.mendrx.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mendrx.backend.exception.DietPlanNotFoundException;
import com.mendrx.backend.exception.DietPlanVersionsExhaustedException;
import com.mendrx.backend.exception.SnDPlanNotFoundException;
import com.mendrx.backend.model.*;
import com.mendrx.backend.model.request.GenerateDietPlanRequestModel;
import com.mendrx.backend.model.request.GenerateSnDPlanRequestModel;
import com.mendrx.backend.model.request.NewDietPlanRequestModel;
import com.mendrx.backend.repository.DietPlanRepository;
import com.mendrx.backend.repository.SnDPlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class SnDPlanService {

    private static final int MAX_DIET_VERSIONS = 5; // 1 initial + 4 additional

    @Autowired
    private SnDPlanRepository snDPlanRepository;

    @Autowired
    private DietPlanRepository dietPlanRepository;

    @Autowired
    private SnDPromptService snDPromptService;

    @Autowired
    private ObjectMapper objectMapper;

    public SnDPlan generateSnDPlan(Report report, GenerateSnDPlanRequestModel request) throws IOException {
        String planResponse = snDPromptService.generateSnDPlan(report, request);
        planResponse = planResponse.replaceAll("^```json\\s*", "")
                .replaceAll("\\s*```$", "")
                .trim();

        try {
            // Parse the response JSON
            JsonNode rootNode = objectMapper.readTree(planResponse);

            // Create new SnDPlan
            SnDPlan snDPlan = new SnDPlan();
            snDPlan.setReport(report);

            // Parse supplements
            List<Supplement> supplements = new ArrayList<>();
            ParseSupplementsPlanFromResponse(rootNode, supplements);
            snDPlan.setSupplements(supplements);

            // Parse diet plan
            List<DayPlan> dietPlan = new ArrayList<>();
            parseDietPlanFromResponse(dietPlan, rootNode);

            DietPlan initialVersion = new DietPlan();
            initialVersion.setVersionNumber(1);
            initialVersion.setSnDPlan(snDPlan);
            initialVersion.setDayPlans(dietPlan);

            snDPlan.getDietPlanVersions().add(initialVersion);

            // Save and return
            return saveSnDPlan(snDPlan);

        } catch (Exception e) {
            throw new IOException("Failed to parse supplements and diet plan: " + e.getMessage(), e);
        }
    }

    private static void ParseSupplementsPlanFromResponse(JsonNode rootNode, List<Supplement> supplements) {
        if (rootNode.has("supplements")) {
            JsonNode supplementsNode = rootNode.get("supplements");
            for (JsonNode supplementNode : supplementsNode) {
                Supplement supplement = new Supplement();
                supplement.setId(UUID.randomUUID());
                if (supplementNode.has("name")) {
                    supplement.setName(supplementNode.get("name").asText());
                }
                if (supplementNode.has("purpose")) {
                    supplement.setPurpose(supplementNode.get("purpose").asText());
                }
                if (supplementNode.has("timing")) {
                    supplement.setTiming(supplementNode.get("timing").asText());
                }
                if (supplementNode.has("dosage")) {
                    supplement.setDosage(supplementNode.get("dosage").asText());
                }
                if (supplementNode.has("precautions")) {
                    supplement.setPrecautions(supplementNode.get("precautions").asText());
                }
                if(supplementNode.has("timing_category")) {
                    supplement.setTimingCategory(supplementNode.get("timing_category").asText());
                }
                supplements.add(supplement);
            }
        }
    }

    public DietPlan generateAdditionalDietPlan(Report report, GenerateDietPlanRequestModel request) throws IOException {

        SnDPlan existingPlan = getSnDPlan(report.getId());

        // Check version limit
        if (existingPlan.getVersionCount() >= MAX_DIET_VERSIONS) {
            throw new DietPlanVersionsExhaustedException(String.format("Maximum of %d Diet Plan versions allowed", MAX_DIET_VERSIONS));
        }

        String planResponse = snDPromptService.generateDietPlan(report, request);
        planResponse = planResponse.replaceAll("^```json\\s*", "")
                .replaceAll("\\s*```$", "")
                .trim();
        try {
            JsonNode rootNode = objectMapper.readTree(planResponse);

            // Parse the diet plan portion only
            List<DayPlan> newDietDayPlans = new ArrayList<>();
            parseDietPlanFromResponse(newDietDayPlans, rootNode);

            // Create new version
            DietPlan newVersion = new DietPlan();
            newVersion.setVersionNumber(existingPlan.getVersionCount() + 1);
            newVersion.setSnDPlan(existingPlan);
            newVersion.setDayPlans(newDietDayPlans);

            // Update plan
            existingPlan.getDietPlanVersions().add(newVersion);
            existingPlan.setVersionCount(existingPlan.getVersionCount() + 1);

            saveSnDPlan(existingPlan);
            return existingPlan.getDietPlanVersions().get(existingPlan.getDietPlanVersions().size() - 1);
        } catch (Exception e) {
            throw new IOException("Failed to parse diet plan: " + e.getMessage(), e);
        }
    }

    @Transactional
    private SnDPlan saveSnDPlan(SnDPlan snDPlan) {
        return snDPlanRepository.save(snDPlan);
    }

    @Transactional(readOnly = true)
    public SnDPlan getSnDPlan(UUID reportId) {
        return snDPlanRepository.findByReportId(reportId)
                .orElseThrow(SnDPlanNotFoundException::new);
    }

    private void parseDietPlanFromResponse(List<DayPlan> dietPlan, JsonNode rootNode) {
        if (rootNode.has("diet_plan")) {
            JsonNode dietPlanNode = rootNode.get("diet_plan");
            for (JsonNode dayNode : dietPlanNode) {
                DayPlan dayPlan = new DayPlan();
                dayPlan.setId(UUID.randomUUID());
                if (dayNode.has("day")) {
                    if(dietPlanNode.size() == 1) {
                        dayPlan.setDay("Recommended Plan");
                    } else {
                        dayPlan.setDay("Day " + dayNode.get("day").asInt());
                    }
                }
                if (dayNode.has("pre_morning")) {
                    dayPlan.setPreMorning(dayNode.get("pre_morning").asText());
                }
                if (dayNode.has("morning")) {
                    dayPlan.setMorning(dayNode.get("morning").asText());
                }
                if (dayNode.has("mid_morning")) {
                    dayPlan.setMidMorning(dayNode.get("mid_morning").asText());
                }
                if (dayNode.has("lunch")) {
                    dayPlan.setLunch(dayNode.get("lunch").asText());
                }
                if (dayNode.has("early_evening")) {
                    dayPlan.setEarlyEvening(dayNode.get("early_evening").asText());
                }
                if (dayNode.has("night")) {
                    dayPlan.setNight(dayNode.get("night").asText());
                }
                if (dayNode.has("bedtime")) {
                    dayPlan.setBedtime(dayNode.get("bedtime").asText());
                }
                dietPlan.add(dayPlan);
            }
        }
    }

    @Transactional(readOnly = true)
    public boolean existsByReportId(UUID reportId) {
        return snDPlanRepository.existsByReportId(reportId);
    }

    /**
     * Updates only the supplements and supplement notes in an existing SnDPlan
     */
    @Transactional
    public SnDPlan updateSupplements(UUID reportId, List<Supplement> updatedSupplements, String supplementNotes) {
        SnDPlan existingPlan = getSnDPlan(reportId);

        // Ensure all supplements have valid IDs
        List<Supplement> processedSupplements = updatedSupplements.stream()
                .peek(supplement -> {
                    if (supplement.getId() == null) {
                        supplement.setId(UUID.randomUUID());
                    }
                })
                .toList();

        // Update supplements
        existingPlan.getSupplements().clear();
        existingPlan.getSupplements().addAll(processedSupplements);

        // Update supplement notes if provided
        if (supplementNotes != null) {
            existingPlan.setSupplementNotes(supplementNotes);
        }

        return saveSnDPlan(existingPlan);
    }

    public DietPlan updateDietPlan(DietPlan updatedVersion) {
        // Find the diet plan version by ID
        DietPlan existingVersion = getDietPlan(updatedVersion.getId());

        // Ensure all day plans have valid IDs
        List<DayPlan> processedDayPlans = updatedVersion.getDayPlans().stream()
                .peek(dayPlan -> {
                    if (dayPlan.getId() == null) {
                        dayPlan.setId(UUID.randomUUID());
                    }
                })
                .toList();

        // Update day plans
        existingVersion.getDayPlans().clear();
        existingVersion.getDayPlans().addAll(processedDayPlans);

        // Update diet notes if provided
        if (updatedVersion.getDietNotes() != null) {
            existingVersion.setDietNotes(updatedVersion.getDietNotes());
        }

        return saveDietPlan(existingVersion);
    }

    @Transactional
    private DietPlan saveDietPlan(DietPlan dietPlan) {
        return dietPlanRepository.save(dietPlan);
    }

    @Transactional(readOnly = true)
    public DietPlan getDietPlan(UUID dietPlanId) {
        return dietPlanRepository.findById(dietPlanId)
                .orElseThrow(DietPlanNotFoundException::new);
    }

    /**
     * Generates a new diet plan from the stepper's diet configuration.
     * If an SnDPlan already exists for the report, adds a new diet plan version.
     * If not, creates a new SnDPlan with empty supplements and adds the diet plan as version 1.
     *
     * @return Object[] { DietPlan, boolean isNewSnDPlan }
     */
    public Object[] generateNewDietPlan(Report report, NewDietPlanRequestModel request) throws IOException {
        String planResponse = snDPromptService.generateDietPlanFromConfig(report, request);
        planResponse = planResponse.replaceAll("^```json\\s*", "")
                .replaceAll("\\s*```$", "")
                .trim();

        try {
            JsonNode rootNode = objectMapper.readTree(planResponse);

            // Parse the diet plan from the AI response
            List<DayPlan> newDayPlans = new ArrayList<>();
            parseDietPlanFromResponse(newDayPlans, rootNode);

            boolean isNewSnDPlan = false;

            // Check if snd_plan already exists for this report
            SnDPlan snDPlan;
            try {
                snDPlan = getSnDPlan(report.getId());
            } catch (SnDPlanNotFoundException e) {
                snDPlan = null;
            }

            if (snDPlan != null) {
                // Existing snd_plan — add as a new diet plan version
                if (snDPlan.getVersionCount() >= MAX_DIET_VERSIONS) {
                    throw new DietPlanVersionsExhaustedException(
                            String.format("Maximum of %d Diet Plan versions allowed", MAX_DIET_VERSIONS));
                }

                DietPlan newVersion = new DietPlan();
                newVersion.setVersionNumber(snDPlan.getVersionCount() + 1);
                newVersion.setSnDPlan(snDPlan);
                newVersion.setDayPlans(newDayPlans);

                snDPlan.getDietPlanVersions().add(newVersion);
                snDPlan.setVersionCount(snDPlan.getVersionCount() + 1);

                saveSnDPlan(snDPlan);
                return new Object[] {
                        snDPlan.getDietPlanVersions().get(snDPlan.getDietPlanVersions().size() - 1),
                        false
                };
            } else {
                // No snd_plan exists — create a new one with empty supplements
                isNewSnDPlan = true;
                snDPlan = new SnDPlan();
                snDPlan.setReport(report);
                snDPlan.setSupplements(new ArrayList<>());

                DietPlan initialVersion = new DietPlan();
                initialVersion.setVersionNumber(1);
                initialVersion.setSnDPlan(snDPlan);
                initialVersion.setDayPlans(newDayPlans);

                snDPlan.getDietPlanVersions().add(initialVersion);

                saveSnDPlan(snDPlan);
                return new Object[] {
                        snDPlan.getDietPlanVersions().get(0),
                        true
                };
            }
        } catch (DietPlanVersionsExhaustedException e) {
            throw e;
        } catch (Exception e) {
            throw new IOException("Failed to parse diet plan from config: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public boolean existsByReportIdSafe(UUID reportId) {
        return snDPlanRepository.existsByReportId(reportId);
    }

}