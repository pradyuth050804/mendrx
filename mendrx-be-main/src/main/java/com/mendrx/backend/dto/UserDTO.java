package com.mendrx.backend.dto;

import com.mendrx.backend.enums.UserTypeEnum;
import com.mendrx.backend.model.Parent;

import java.time.LocalDateTime;

public class UserDTO {
    private String email;
    private UserTypeEnum type;
    private Integer credits;
    private LocalDateTime expiry;
    private ParentDTO parentDTO;

    public UserDTO(String email, UserTypeEnum type, Integer credits, LocalDateTime expiry, ParentDTO parentDTO) {
        this.email = email;
        this.type = type;
        this.credits = credits;
        this.expiry = expiry;
        this.parentDTO = parentDTO;
    }

    // Getters and setters
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public UserTypeEnum getType() {
        return type;
    }

    public void setType(UserTypeEnum type) {
        this.type = type;
    }

    public Integer getCredits() {
        return credits;
    }

    public void setCredits(Integer credits) {
        this.credits = credits;
    }

    public LocalDateTime getExpiry() {
        return expiry;
    }

    public void setExpiry(LocalDateTime expiry) {
        this.expiry = expiry;
    }

    public ParentDTO getParentDTO() {
        return parentDTO;
    }

    public void setParentDTO(ParentDTO parentDTO) {
        this.parentDTO = parentDTO;
    }
}
