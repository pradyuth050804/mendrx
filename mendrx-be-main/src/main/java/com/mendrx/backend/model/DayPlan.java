package com.mendrx.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.util.UUID;

@Embeddable
public class DayPlan {
    @Column(nullable = false)
    private UUID id;

    @Column(columnDefinition = "TEXT")
    private String day;

    @Column(columnDefinition = "TEXT")
    private String preMorning;

    @Column(columnDefinition = "TEXT")
    private String morning;

    @Column(columnDefinition = "TEXT")
    private String midMorning;

    @Column(columnDefinition = "TEXT")
    private String lunch;

    @Column(columnDefinition = "TEXT")
    private String earlyEvening;

    @Column(columnDefinition = "TEXT")
    private String night;

    @Column(columnDefinition = "TEXT")
    private String bedtime;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getDay() {
        return day;
    }

    public void setDay(String day) {
        this.day = day;
    }

    public String getPreMorning() {
        return preMorning;
    }

    public void setPreMorning(String preMorning) {
        this.preMorning = preMorning;
    }

    public String getMorning() {
        return morning;
    }

    public void setMorning(String morning) {
        this.morning = morning;
    }

    public String getMidMorning() {
        return midMorning;
    }

    public void setMidMorning(String midMorning) {
        this.midMorning = midMorning;
    }

    public String getLunch() {
        return lunch;
    }

    public void setLunch(String lunch) {
        this.lunch = lunch;
    }

    public String getEarlyEvening() {
        return earlyEvening;
    }

    public void setEarlyEvening(String earlyEvening) {
        this.earlyEvening = earlyEvening;
    }

    public String getNight() {
        return night;
    }

    public void setNight(String night) {
        this.night = night;
    }

    public String getBedtime() {
        return bedtime;
    }

    public void setBedtime(String bedtime) {
        this.bedtime = bedtime;
    }
}
