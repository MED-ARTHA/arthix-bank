package com.arthix.backend.repository;

import com.arthix.backend.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.email = :email")
    Optional<User> findByEmailForUpdate(@Param("email") String email);

    java.util.Optional<User> findByAccountNumber(String accountNumber);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<User> findWithLockByAccountNumber(String accountNumber);

    @org.springframework.data.jpa.repository.Query("select u.accountNumber from User u where u.email = :email")
    java.util.Optional<String> findAccountNumberByEmail(@org.springframework.data.repository.query.Param("email") String email);}
