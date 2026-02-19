package com.mendrx.backend.repository;

import com.mendrx.backend.model.SupplementBrandGuideline;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupplementBrandGuidelineRepository extends JpaRepository<SupplementBrandGuideline, UUID> {

    /**
     * Find all supplement brand guidelines for a specific parent
     */
    Page<SupplementBrandGuideline> findByParentIdOrderBySupplementNameAsc(Integer parentId, Pageable pageable);

    /**
     * Find all supplement brand guidelines for a specific parent (non-paginated)
     */
    List<SupplementBrandGuideline> findByParentIdOrderBySupplementNameAsc(Integer parentId);

    /**
     * Find a specific supplement brand guideline by parent and supplement name
     */
    Optional<SupplementBrandGuideline> findByParentIdAndSupplementNameIgnoreCase(Integer parentId, String supplementName);

    /**
     * Check if a supplement brand guideline exists for a parent with the given supplement name
     */
    boolean existsByParentIdAndSupplementNameIgnoreCase(Integer parentId, String supplementName);

    /**
     * Find a supplement brand guideline by ID and parent (for security - ensure parent owns the record)
     */
    Optional<SupplementBrandGuideline> findByIdAndParentId(UUID id, Integer parentId);

    /**
     * Get all supplement names for a parent (for AI matching)
     */
    @Query("SELECT s.supplementName FROM SupplementBrandGuideline s WHERE s.parent.id = :parentId")
    List<String> findSupplementNamesByParentId(@Param("parentId") Integer parentId);

    /**
     * Delete a supplement brand guideline by ID and parent
     */
    void deleteByIdAndParentId(UUID id, Integer parentId);
}