package com.mendrx.backend.repository;

import com.mendrx.backend.model.Parent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ParentRepository extends JpaRepository<Parent, Integer> {
}
