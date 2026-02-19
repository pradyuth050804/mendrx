package com.mendrx.backend.repository;

import com.mendrx.backend.model.DietPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DietPlanRepository extends JpaRepository<DietPlan, UUID> {
}
