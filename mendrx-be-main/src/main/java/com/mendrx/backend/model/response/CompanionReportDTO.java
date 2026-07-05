package com.mendrx.backend.model.response;

import com.mendrx.backend.enums.DietEnum;
import com.mendrx.backend.enums.ExistingConditionEnum;
import com.mendrx.backend.enums.LifeStyleHabitEnum;
import com.mendrx.backend.model.BloodPanel;
import com.mendrx.backend.model.Report;
import com.mendrx.backend.model.shared.BloodMarker;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public class CompanionReportDTO {
    private UUID id;
    private LocalDateTime reportDate;
    private LocalDateTime updatedAt;
    
    private CompanionClientDTO client;
    
    private Integer height;
    private Double weight;
    private Double waist;
    private Double bmi;
    
    private DietEnum diet;
    private Set<LifeStyleHabitEnum> lifestyleHabits;
    private Set<ExistingConditionEnum> existingConditions;
    
    private Map<BloodPanel, List<BloodMarker>> bloodPanelListMap;
    private String notes;

    public CompanionReportDTO() {
    }

    public CompanionReportDTO(Report report) {
        this.id = report.getId();
        this.reportDate = report.getReportDate();
        // Since updatedAt might not be available, we can just use reportDate
        
        if (report.getClient() != null) {
            this.client = new CompanionClientDTO();
            this.client.setName(report.getClient().getName());
            this.client.setGender(report.getClient().getGender());
            this.client.setBirthMonth(report.getClient().getBirthMonth());
        }
        
        this.height = report.getHeight();
        this.weight = report.getWeight();
        this.waist = report.getWaist();
        this.bmi = report.getBmi();
        
        this.diet = report.getDiet();
        this.lifestyleHabits = report.getLifestyleHabits();
        this.existingConditions = report.getExistingConditions();
        
        this.bloodPanelListMap = report.getBloodPanelListMap();
        this.notes = report.getNotes();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public LocalDateTime getReportDate() { return reportDate; }
    public void setReportDate(LocalDateTime reportDate) { this.reportDate = reportDate; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public CompanionClientDTO getClient() { return client; }
    public void setClient(CompanionClientDTO client) { this.client = client; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public Double getWaist() { return waist; }
    public void setWaist(Double waist) { this.waist = waist; }

    public Double getBmi() { return bmi; }
    public void setBmi(Double bmi) { this.bmi = bmi; }

    public DietEnum getDiet() { return diet; }
    public void setDiet(DietEnum diet) { this.diet = diet; }

    public Set<LifeStyleHabitEnum> getLifestyleHabits() { return lifestyleHabits; }
    public void setLifestyleHabits(Set<LifeStyleHabitEnum> lifestyleHabits) { this.lifestyleHabits = lifestyleHabits; }

    public Set<ExistingConditionEnum> getExistingConditions() { return existingConditions; }
    public void setExistingConditions(Set<ExistingConditionEnum> existingConditions) { this.existingConditions = existingConditions; }

    public Map<BloodPanel, List<BloodMarker>> getBloodPanelListMap() { return bloodPanelListMap; }
    public void setBloodPanelListMap(Map<BloodPanel, List<BloodMarker>> bloodPanelListMap) { this.bloodPanelListMap = bloodPanelListMap; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public static class CompanionClientDTO {
        private String name;
        private String gender;
        private String birthMonth;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getGender() { return gender; }
        public void setGender(String gender) { this.gender = gender; }
        public String getBirthMonth() { return birthMonth; }
        public void setBirthMonth(String birthMonth) { this.birthMonth = birthMonth; }
    }
}
