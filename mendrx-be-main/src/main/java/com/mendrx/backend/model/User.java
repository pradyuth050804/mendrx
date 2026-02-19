package com.mendrx.backend.model;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.mendrx.backend.enums.UserTypeEnum;
import com.mendrx.backend.enums.WhiteLabelType;
import jakarta.persistence.*;

import java.time.LocalDateTime;


@Entity
@Table(name = "\"user\"")
public class User {
    @Id
    @GeneratedValue
    @Column(columnDefinition = "UUID")
    private UUID id;

    @Column(unique = true)
    private UUID authId;

    @Column(unique = true)
    private String email;

    private Integer credits;

    @Enumerated(EnumType.STRING)
    private UserTypeEnum type;

    @Column(name = "subscription_expiry")
    private LocalDateTime subscriptionExpiry;

    @Column(name = "white_label_enabled")
    private Boolean whiteLabelEnabled = false;

    @Column(name = "white_label_type")
    @Enumerated(EnumType.STRING)
    private WhiteLabelType whiteLabelType;

    @Column(name = "white_label_text")
    private String whiteLabelText;

    @Column(name = "white_label_logo_file_name")
    private String whiteLabelLogoFileName;

    @Column(name = "custom_disclaimer", columnDefinition = "TEXT")
    private String customDisclaimer;

    @Column(name = "signoff_name")
    private String signoffName;

    @Column(name = "signoff_designation")
    private String signoffDesignation;

    @Column(name = "signoff_signature_file_name")
    private String signoffSignatureFileName;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Parent parent;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    @JsonIgnore
    private List<Subscription> subscriptions;

    // Getters and setters

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAuthId() {
        return authId;
    }

    public String getEmail() {
        return email;
    }

    public UserTypeEnum getType() {
        return type;
    }

    public Integer getCredits() {
        return credits;
    }

    public LocalDateTime getSubscriptionExpiry() {
        return subscriptionExpiry;
    }

    public List<Subscription> getSubscriptions() {
        return subscriptions;
    }

    public Boolean getWhiteLabelEnabled() {
        return whiteLabelEnabled;
    }

    public WhiteLabelType getWhiteLabelType() {
        return whiteLabelType;
    }

    public String getWhiteLabelText() {
        return whiteLabelText;
    }

    public String getWhiteLabelLogoFileName() {
        return whiteLabelLogoFileName;
    }

    public String getCustomDisclaimer() {
        return customDisclaimer;
    }

    public String getSignoffName() {
        return signoffName;
    }

    public String getSignoffDesignation() {
        return signoffDesignation;
    }

    public String getSignoffSignatureFileName() {
        return signoffSignatureFileName;
    }

    public Parent getParent() {
        return parent;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setAuthId(UUID authId) {
        this.authId = authId;
    }

    public void setCredits(Integer credits) {
        this.credits = credits;
    }

    public void setType(UserTypeEnum type) {
        this.type = type;
    }

    public void setSubscriptionExpiry(LocalDateTime subscriptionExpiry) {
        this.subscriptionExpiry = subscriptionExpiry;
    }

    public void setWhiteLabelEnabled(Boolean whiteLabelEnabled) {
        this.whiteLabelEnabled = whiteLabelEnabled;
    }

    public void setWhiteLabelType(WhiteLabelType whiteLabelType) {
        this.whiteLabelType = whiteLabelType;
    }

    public void setWhiteLabelText(String whiteLabelText) {
        this.whiteLabelText = whiteLabelText;
    }

    public void setWhiteLabelLogoFileName(String whiteLabelLogoFileName) {
        this.whiteLabelLogoFileName = whiteLabelLogoFileName;
    }

    public void setCustomDisclaimer(String customDisclaimer) {
        this.customDisclaimer = customDisclaimer;
    }

    public void setSignoffName(String signoffName) {
        this.signoffName = signoffName;
    }

    public void setSignoffDesignation(String signoffDesignation) {
        this.signoffDesignation = signoffDesignation;
    }

    public void setSignoffSignatureFileName(String signoffSignatureFileName) {
        this.signoffSignatureFileName = signoffSignatureFileName;
    }

    public void setParent(Parent parent) {
        this.parent = parent;
    }
}

