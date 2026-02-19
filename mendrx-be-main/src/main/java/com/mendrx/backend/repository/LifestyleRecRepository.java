package com.mendrx.backend.repository;

import com.mendrx.backend.model.LifestyleRecommendations;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LifestyleRecRepository extends JpaRepository<LifestyleRecommendations, UUID> {

    // Find by report ID. Use Optional for better null handling.
    Optional<LifestyleRecommendations> findByReportId(UUID reportId);

    // Check existence by report ID efficiently.
    boolean existsByReportId(UUID reportId);

}