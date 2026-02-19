package com.mendrx.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.mendrx.backend.enums.SubscriptionTypeEnum;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "subscription")
public class Subscription {
    @Id
    @GeneratedValue
    @Column(columnDefinition = "UUID")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonBackReference
    private User user;

    private Integer credits;

    @Enumerated(EnumType.STRING)
    private SubscriptionTypeEnum type;

    @Column(name = "expiry")
    private LocalDateTime expiry;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Subscription() {
    }

    public Subscription(User user, Integer credits, SubscriptionTypeEnum type, LocalDateTime expiry) {
        this.user = user;
        this.credits = credits;
        this.type = type;
        this.expiry = expiry;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Getters and setters

    public UUID getId() {
        return id;
    }

    public Integer getCredits() {
        return credits;
    }

    public void setCredits(Integer credits) {
        this.credits = credits;
    }

    public SubscriptionTypeEnum getType() {
        return type;
    }

    public LocalDateTime getExpiry() {
        return expiry;
    }

    public User getUser() {
        return user;
    }
}
