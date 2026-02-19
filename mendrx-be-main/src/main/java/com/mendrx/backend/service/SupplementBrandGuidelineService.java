package com.mendrx.backend.service;

import com.mendrx.backend.exception.SupplementBrandGuidelineNotFoundException;
import com.mendrx.backend.exception.DuplicateSupplementException;
import com.mendrx.backend.model.SupplementBrandGuideline;
import com.mendrx.backend.model.User;
import com.mendrx.backend.model.request.CreateSupplementBrandGuidelineRequestModel;
import com.mendrx.backend.model.request.UpdateSupplementBrandGuidelineRequestModel;
import com.mendrx.backend.repository.SupplementBrandGuidelineRepository;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class SupplementBrandGuidelineService {

    private static final Logger logger = LoggerFactory.getLogger(SupplementBrandGuidelineService.class);

    @Autowired
    private SupplementBrandGuidelineRepository supplementRepository;

    /**
     * Get all supplement brand guidelines for a user with pagination
     */
    @Transactional(readOnly = true)
    public Page<SupplementBrandGuideline> getAllSupplementsForUser(User user, Pageable pageable) {
        LoggingUtils.logInfo(logger, "Fetching supplement brand guidelines for user: {} with pagination", user.getId());
        return supplementRepository.findByParentIdOrderBySupplementNameAsc(user.getParent().getId(), pageable);
    }

    /**
     * Get all supplement brand guidelines for a user (non-paginated)
     */
    @Transactional(readOnly = true)
    public List<SupplementBrandGuideline> getAllSupplementsForUser(User user) {
        LoggingUtils.logInfo(logger, "Fetching all supplement brand guidelines for user: {}", user.getId());
        return supplementRepository.findByParentIdOrderBySupplementNameAsc(user.getParent().getId());
    }

    /**
     * Get a specific supplement brand guideline by ID
     */
    @Transactional(readOnly = true)
    public SupplementBrandGuideline getSupplementById(UUID id, User user) {
        LoggingUtils.logInfo(logger, "Fetching supplement brand guideline with ID: {} for user: {}", id, user.getId());
        return supplementRepository.findByIdAndParentId(id, user.getParent().getId())
                .orElseThrow(() -> {
                    LoggingUtils.logWarn(logger, "Supplement brand guideline not found with ID: {} for user: {}", id, user.getId());
                    return new SupplementBrandGuidelineNotFoundException("Supplement brand guideline not found");
                });
    }

    /**
     * Create a new supplement brand guideline
     */
    @Transactional
    public SupplementBrandGuideline createSupplement(User user, CreateSupplementBrandGuidelineRequestModel request) {
        LoggingUtils.logInfo(logger, "Creating new supplement brand guideline for user: {} with supplement: {}",
                user.getId(), request.getSupplementName());

        // Check for duplicate supplement name for the user
        if (supplementRepository.existsByParentIdAndSupplementNameIgnoreCase(user.getParent().getId(), request.getSupplementName())) {
            LoggingUtils.logWarn(logger, "Duplicate supplement name '{}' for user: {}", request.getSupplementName(), user.getId());
            throw new DuplicateSupplementException("A supplement with this name already exists");
        }

        SupplementBrandGuideline supplement = new SupplementBrandGuideline(
                user.getParent(),
                request.getSupplementName().trim(),
                request.getBrandName().trim(),
                request.getProductLink() != null ? request.getProductLink().trim() : null,
                request.getGuidelines() != null ? request.getGuidelines().trim() : null
        );

        SupplementBrandGuideline savedSupplement = supplementRepository.save(supplement);
        LoggingUtils.logInfo(logger, "Successfully created supplement brand guideline with ID: {} for user: {}",
                savedSupplement.getId(), user.getId());

        return savedSupplement;
    }

    /**
     * Update an existing supplement brand guideline
     */
    @Transactional
    public SupplementBrandGuideline updateSupplement(UUID id, User user, UpdateSupplementBrandGuidelineRequestModel request) {
        LoggingUtils.logInfo(logger, "Updating supplement brand guideline with ID: {} for user: {}", id, user.getId());

        SupplementBrandGuideline existingSupplement = getSupplementById(id, user);

        // Check for duplicate supplement name (excluding current supplement)
        if (!existingSupplement.getSupplementName().equalsIgnoreCase(request.getSupplementName()) &&
                supplementRepository.existsByParentIdAndSupplementNameIgnoreCase(user.getParent().getId(), request.getSupplementName())) {
            LoggingUtils.logWarn(logger, "Duplicate supplement name '{}' for user: {}", request.getSupplementName(), user.getId());
            throw new DuplicateSupplementException("A supplement with this name already exists");
        }

        // Update fields
        existingSupplement.setSupplementName(request.getSupplementName().trim());
        existingSupplement.setBrandName(request.getBrandName().trim());
        existingSupplement.setProductLink(request.getProductLink() != null ? request.getProductLink().trim() : null);
        existingSupplement.setGuidelines(request.getGuidelines() != null ? request.getGuidelines().trim() : null);

        SupplementBrandGuideline updatedSupplement = supplementRepository.save(existingSupplement);
        LoggingUtils.logInfo(logger, "Successfully updated supplement brand guideline with ID: {} for user: {}", id, user.getId());

        return updatedSupplement;
    }

    /**
     * Delete a supplement brand guideline
     */
    @Transactional
    public void deleteSupplement(UUID id, User user) {
        LoggingUtils.logInfo(logger, "Deleting supplement brand guideline with ID: {} for user: {}", id, user.getId());

        // Verify the supplement exists and belongs to the user
        SupplementBrandGuideline supplement = getSupplementById(id, user);

        supplementRepository.deleteByIdAndParentId(id, user.getParent().getId());
        LoggingUtils.logInfo(logger, "Successfully deleted supplement brand guideline with ID: {} for user: {}", id, user.getId());
    }

    /**
     * Check if a supplement with the given name exists for the user
     */
    @Transactional(readOnly = true)
    public boolean supplementExistsForUser(User user, String supplementName) {
        return supplementRepository.existsByParentIdAndSupplementNameIgnoreCase(user.getParent().getId(), supplementName);
    }
}