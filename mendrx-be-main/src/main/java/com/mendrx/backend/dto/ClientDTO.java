package com.mendrx.backend.dto;
import com.mendrx.backend.model.Client;

import java.time.YearMonth;

public class ClientDTO {
    private String id;
    private String name;
    private String phoneNumber;
    private String gender;
    private YearMonth birthMonth;
    private String email;
    private String createdAt;
    private String updatedAt;

    public ClientDTO(Client client) {
        this.id = client.getId().toString();
        this.name = client.getName();
        this.phoneNumber = client.getPhoneNumber();
        this.gender = client.getGender();
        this.birthMonth= client.getBirthMonthAsYearMonth();
        this.email = client.getEmail();
        this.createdAt = client.getCreatedAt().toString();
        this.updatedAt = client.getUpdatedAt().toString();
    }

    public ClientDTO() {}

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getGender() {
        return gender;
    }

    public YearMonth getBirthMonth() {
        return birthMonth;
    }

    public String getEmail() {
        return email;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public void setBirthMonth(YearMonth birthMonth) {
        this.birthMonth = birthMonth;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
