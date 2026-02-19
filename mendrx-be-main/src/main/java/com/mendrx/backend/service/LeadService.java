package com.mendrx.backend.service;

import com.mendrx.backend.model.Lead;
import com.mendrx.backend.model.request.FreeTrailRequestModel;
import com.mendrx.backend.repository.LeadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class LeadService {

    @Autowired
    private LeadRepository leadRepository;
    @Autowired
    private JwtValidatorService jwtValidatorService;
    @Autowired
    private SlackNotificationService slackNotificationService;


    @Transactional
    public void registerLead(String token, FreeTrailRequestModel freeTrailRequest) {
        UUID authId = jwtValidatorService.getSubjectFromToken(token);
        if (authId == null) {
            throw new IllegalArgumentException("Invalid token");
        }
        Lead lead = new Lead();
        lead.setEmail(freeTrailRequest.getEmail());
        lead.setPhone(freeTrailRequest.getPhone());
        Lead savedLead = leadRepository.save(lead);
        slackNotificationService.sendLeadNotification(savedLead);
    }
}
