package com.mendrx.backend.model;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.mendrx.backend.enums.DietEnum;
import com.mendrx.backend.enums.ExistingConditionEnum;
import com.mendrx.backend.enums.LifeStyleHabitEnum;
import com.mendrx.backend.model.shared.BloodMarker;
import com.mendrx.backend.util.DerivedMarkersCalculator;
import com.mendrx.backend.util.converter.ExistingConditionConverter;
import com.mendrx.backend.util.converter.LifeStyleHabitConverter;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "report")
public class Report {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @ManyToOne
    @JoinColumn(name = "client_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Client client;

    @Column(nullable = false)
    private LocalDateTime reportDate;

    @Column
    private Integer height; // in feet

    @Column
    private Double weight; // in kg

    @Column
    private Double waist; // in inches

    @Enumerated(EnumType.STRING)
    @Column
    private DietEnum diet;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = LifeStyleHabitConverter.class)
    private Set<LifeStyleHabitEnum> lifestyleHabits = new HashSet<>();

    @Column(columnDefinition = "TEXT")
    @Convert(converter = ExistingConditionConverter.class)
    private Set<ExistingConditionEnum> existingConditions = new HashSet<>();

    @Transient
    private String clientHistory;

    @Column(columnDefinition = "BYTEA")
    @JsonIgnore
    private byte[] clientHistoryEncrypted;


    @Transient
    @JsonIgnore
    private List<BloodMarker> bloodMarkers;

    @Transient
    private Map<BloodPanel,List<BloodMarker>> bloodPanelListMap;
    

    @Transient
    private String notes;

    @Column(columnDefinition = "BYTEA")
    @JsonIgnore
    private byte[] bloodMarkersEncrypted;

    @Column(columnDefinition = "BYTEA")
    @JsonIgnore
    private byte[] notesEncrypted;

    @Transient
    private Double bmi;

    @Column(columnDefinition = "boolean default false")
    private boolean migrationDone;


    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Constructors, getters, and setters

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public String getString() {
        LifeStyleHabitConverter lifestyleConverter = new LifeStyleHabitConverter();
        ExistingConditionConverter conditionConverter = new ExistingConditionConverter();
        String heightString = (height!=null && height!=0)?(", Height=" + height):"";
        String weightString = (weight!=null && weight!=0)?(", Weight=" + weight):"";
        String waistString = (waist!=null && waist!=0)?(", Waist=" + waist):"";
        String dietString = (diet != null) ? (", Diet=" + diet.toString()) : "";
        String lifestyleHabitsString = ", Lifestyle habits=";
        if (!lifestyleHabits.isEmpty()) {
            lifestyleHabitsString += lifestyleConverter.convertToDatabaseColumn(lifestyleHabits);
        } else {
            lifestyleHabitsString += "[]";
        }
        String existingConditionsString = ", Existing health conditions=";
        if (!existingConditions.isEmpty()) {
            existingConditionsString += conditionConverter.convertToDatabaseColumn(existingConditions);
        } else {
            existingConditionsString += "[]";
        }
        String clientHistoryString = (clientHistory != null) ? (", Client history questionnaire =" + clientHistory) : "";

        return "Client Information: [gender=" + client.getGender() +
                ", age=" + calculateAgeAsOnReportDate() +
                heightString + weightString + waistString +
                dietString + lifestyleHabitsString + existingConditionsString + clientHistoryString + "]";
    }

    private int calculateCurrentAge() {
        YearMonth birthMonth = client.getBirthMonthAsYearMonth();
        YearMonth currentMonth = YearMonth.now();

        int years = currentMonth.getYear() - birthMonth.getYear();

        if (currentMonth.getMonth().getValue() < birthMonth.getMonth().getValue()) {
            years--;
        }

        return years;
    }

    private int calculateAgeAsOnReportDate() {
        YearMonth birthMonth = client.getBirthMonthAsYearMonth();
        YearMonth currentMonth = YearMonth.now();

        int years = currentMonth.getYear() - birthMonth.getYear();

        if (currentMonth.getMonth().getValue() < birthMonth.getMonth().getValue()) {
            years--;
        }

        return years;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Client getClient() {
        return client;
    }

    public void setClient(Client client) {
        this.client = client;
    }

    public String getGender() {
        return client.getGender();
    }

    public Integer getCurrentAge() {
        return calculateCurrentAge();
    }

    public Integer getAgeOnReportDate() {
        return calculateAgeAsOnReportDate();
    }

    public void setBloodMarkers(List<BloodMarker> bloodMarkers) {
        this.bloodMarkers = bloodMarkers;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public LocalDateTime getReportDate() {
        return reportDate;
    }

    public void setReportDate(LocalDateTime reportDate) {
        this.reportDate = reportDate;
    }

    public Integer getHeight() {
        return height;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public Double getWeight() {
        return weight;
    }

    public void setWeight(Double weight) {
        this.weight = weight;
    }

    public Double getWaist() {
        return waist;
    }

    public void setWaist(Double waist) {
        this.waist = waist;
    }

    public DietEnum getDiet() {
        return diet;
    }

    public void setDiet(DietEnum diet) {
        this.diet = diet;
    }

    public Set<LifeStyleHabitEnum> getLifestyleHabits() {
        return lifestyleHabits;
    }

    public void setLifestyleHabits(Set<LifeStyleHabitEnum> lifestyleHabits) {
        this.lifestyleHabits = lifestyleHabits;
    }

    public Set<ExistingConditionEnum> getExistingConditions() {
        return existingConditions;
    }

    public void setExistingConditions(Set<ExistingConditionEnum> existingConditions) {
        this.existingConditions = existingConditions;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<BloodMarker> getBloodMarkers() {
        return bloodMarkers;
    }

	public Map<BloodPanel,List<BloodMarker>> getBloodPanelListMap() {
		return bloodPanelListMap;
	}

	public void setBloodPanelListMap(Map<BloodPanel,List<BloodMarker>> bloodPanelListMap) {
		this.bloodPanelListMap = bloodPanelListMap;
	}

    public byte[] getBloodMarkersEncrypted() {
        return bloodMarkersEncrypted;
    }

    public void setBloodMarkersEncrypted(byte[] bloodMarkersEncrypted) {
        this.bloodMarkersEncrypted = bloodMarkersEncrypted;
    }

    public byte[] getNotesEncrypted() {
        return notesEncrypted;
    }

    public void setNotesEncrypted(byte[] notesEncrypted) {
        this.notesEncrypted = notesEncrypted;
    }

    public String getClientHistory() {
        return clientHistory;
    }

    public void setClientHistory(String clientHistory) {
        this.clientHistory = clientHistory;
    }

    public byte[] getClientHistoryEncrypted() {
        return clientHistoryEncrypted;
    }

    public void setClientHistoryEncrypted(byte[] clientHistoryEncrypted) {
        this.clientHistoryEncrypted = clientHistoryEncrypted;
    }

    public void setBmi(Double bmi) {
        this.bmi = bmi;
    }

    public Double getBmi() {
        if(weight!=null && height!=null) {
            return DerivedMarkersCalculator.calculateBMI(weight, (double) height /100);
        }
        return null;
    }

    public boolean getMigrationDone() {
        return migrationDone;
    }

    public void setMigrationDone(boolean migrationDone) {
        this.migrationDone = migrationDone;
    }
}
