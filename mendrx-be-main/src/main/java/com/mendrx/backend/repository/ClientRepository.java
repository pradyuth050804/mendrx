package com.mendrx.backend.repository;

import com.mendrx.backend.model.Client;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ClientRepository extends JpaRepository<Client, UUID> {
    @Query("SELECT c FROM Client c WHERE c.user.authId = :userAuthId")
    Page<Client> findByUserAuthId(@Param("userAuthId") UUID userAuthId, Pageable pageable);

    @Query("SELECT COUNT(c) > 0 FROM Client c WHERE c.user.authId = :userAuthId")
    boolean existsByUserAuthId(@Param("userAuthId") UUID userAuthId);

    @Query("SELECT c FROM Client c WHERE c.id = :clientId AND c.user.authId = :userAuthId")
    Optional<Client> findByIdAndUserAuthId(
            @Param("clientId") UUID clientId,
            @Param("userAuthId") UUID userAuthId
    );

    @Query("SELECT c FROM Client c WHERE c.user.authId = :userAuthId " +
            "AND (LOWER(c.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "     LOWER(c.phoneNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<Client> findByUserAuthIdAndSearchTerm(
            @Param("userAuthId") UUID userAuthId,
            @Param("searchTerm") String searchTerm,
            Pageable pageable);

}