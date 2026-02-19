package com.mendrx.backend.model;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "\"academy_invitation\"")
public class AcademyInvitation {
    @Id
    @GeneratedValue
    @Column(columnDefinition = "UUID")
    private UUID id;

    @Column(unique = true)
    private String email;

    @Column(name = "payment_done")
    private Boolean paymentDone = false;

    @Column(name = "parent_id")
    private Integer parentId;

    public String getEmail() {
        return email;
    }

    public Boolean getPaymentDone() {
        return paymentDone;
    }

    public Integer getParentId() {
        return parentId;
    }
}
