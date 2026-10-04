package com.arthix.backend.repository;

import com.arthix.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

/** Atomic balance changes: the debit only succeeds if the balance is sufficient. */
public interface WalletRepository extends JpaRepository<User, Long> {

    @Modifying(flushAutomatically = true)
    @Query("update User u set u.balance = u.balance - :amount where u.id = :id and u.balance >= :amount")
    int debit(@Param("id") Long id, @Param("amount") BigDecimal amount);

    @Modifying(flushAutomatically = true)
    @Query("update User u set u.balance = u.balance + :amount where u.id = :id")
    int credit(@Param("id") Long id, @Param("amount") BigDecimal amount);
}