package com.arthix.backend.repository;

import com.arthix.backend.entity.InvestOrder;
import com.arthix.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvestOrderRepository extends JpaRepository<InvestOrder, Long> {
    List<InvestOrder> findTop40ByOwnerOrderByCreatedAtDesc(User owner);
}