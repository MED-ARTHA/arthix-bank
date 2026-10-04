package com.arthix.backend.repository;

import com.arthix.backend.entity.Holding;
import com.arthix.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HoldingRepository extends JpaRepository<Holding, Long> {
    List<Holding> findByOwner(User owner);
    Optional<Holding> findByOwnerAndSymbol(User owner, String symbol);
}