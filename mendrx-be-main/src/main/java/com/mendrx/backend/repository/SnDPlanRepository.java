package com.mendrx.backend.repository;

import com.mendrx.backend.model.SnDPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SnDPlanRepository extends JpaRepository<SnDPlan, UUID> {
    Optional<SnDPlan> findByReportId(UUID reportId);

    boolean existsByReportId(UUID reportId);
}
