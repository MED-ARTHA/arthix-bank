package com.arthix.backend.repository;

import com.arthix.backend.entity.User;
import com.arthix.backend.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {
    List<Voucher> findTop20ByUserOrderByCreatedAtDesc(User user);
    Optional<Voucher> findByCodeAndUser(String code, User user);
}