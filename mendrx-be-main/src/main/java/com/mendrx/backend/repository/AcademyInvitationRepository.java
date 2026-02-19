package com.mendrx.backend.repository;

import com.mendrx.backend.model.AcademyInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AcademyInvitationRepository extends JpaRepository<AcademyInvitation, UUID> {
    Optional<AcademyInvitation> findByEmailIgnoreCase(String email);
}
