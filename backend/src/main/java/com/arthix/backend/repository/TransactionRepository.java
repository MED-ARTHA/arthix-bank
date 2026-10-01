package com.arthix.backend.repository;

import com.arthix.backend.entity.Transaction;
import com.arthix.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findTop50ByUserOrderByCreatedAtDesc(User user);

    java.util.List<com.arthix.backend.entity.Transaction> findByUserAndTypeAndCreatedAtAfter(
        com.arthix.backend.entity.User user, String type, java.time.Instant after);}
