package com.mendrx.backend.repository;

import com.mendrx.backend.model.Report;
import com.mendrx.backend.model.User;
import com.mendrx.backend.model.projection.ReportMetadataProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {

    @Query("select r.user from Report r where r.id = :reportId")
    Optional<User> findUserByReportId(@Param("reportId") UUID reportId);

    @Query("SELECT r.id as id, r.client.id as clientId, r.client.name as clientName, " +
            "r.client.gender as gender, r.reportDate as reportDate, r.updatedAt as updatedAt, " +
            "r.client.birthMonth as birthMonth " +
            "FROM Report r " +
            "WHERE r.user.authId = :userAuthId AND r.notesEncrypted IS NOT NULL " +
            "ORDER BY r.updatedAt DESC")
    Page<ReportMetadataProjection> findReportMetadataByUserId(@Param("userAuthId") UUID userAuthId, Pageable pageable);

    @Query("SELECT r.id as id, r.client.id as clientID, r.client.name as clientName, r.client.gender as gender, r.reportDate as reportDate, r.updatedAt as updatedAt, " +
            "r.client.birthMonth as birthMonth " +
            "FROM Report r " +
            "WHERE r.user.authId = :userAuthId " +
            "AND r.notesEncrypted IS NOT NULL " +
            "AND (LOWER(r.client.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "     LOWER(r.client.phoneNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<ReportMetadataProjection> findByUserIdAndClientSearch(
            @Param("userAuthId") UUID userAuthId,
            @Param("searchTerm") String searchTerm,
            Pageable pageable);

    @Modifying
    @Query("UPDATE Report r SET r.notesEncrypted = :encryptedNotes, r.updatedAt = :updatedAt WHERE r.id = :reportId AND r.user.authId = :userAuthId")
    int updateNotesEncrypted(@Param("reportId") UUID reportId, @Param("userAuthId") UUID userAuthId, @Param("encryptedNotes") byte[] encryptedNotes, @Param("updatedAt") LocalDateTime updatedAt);

    @Modifying
    @Query("DELETE FROM Report r WHERE r.id IN :reportIds AND r.user.authId = :userAuthId")
    void deleteByIdInAndUserId(@Param("reportIds") List<UUID> reportIds, @Param("userAuthId") UUID userAuthId);

    Optional<Report> findFirstByClientIdOrderByUpdatedAtDesc(UUID clientId);
}
