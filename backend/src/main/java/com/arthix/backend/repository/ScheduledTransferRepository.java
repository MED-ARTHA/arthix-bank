package com.arthix.backend.repository;

import com.arthix.backend.entity.ScheduledTransfer;
import com.arthix.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface ScheduledTransferRepository extends JpaRepository<ScheduledTransfer, Long> {
    List<ScheduledTransfer> findByOwnerOrderByNextRunAsc(User owner);
    List<ScheduledTransfer> findByStatusAndNextRunLessThanEqual(String status, Instant now);
}