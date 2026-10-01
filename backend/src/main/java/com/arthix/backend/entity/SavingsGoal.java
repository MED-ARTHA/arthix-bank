package com.arthix.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "savings_goals")
public class SavingsGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 40)
    private String name;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal targetAmount;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal savedAmount = BigDecimal.ZERO;

    private LocalDate deadline;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected SavingsGoal() {}

    public SavingsGoal(User user, String name, BigDecimal targetAmount, LocalDate deadline) {
        this.user = user;
        this.name = name;
        this.targetAmount = targetAmount;
        this.deadline = deadline;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getName() { return name; }
    public BigDecimal getTargetAmount() { return targetAmount; }
    public BigDecimal getSavedAmount() { return savedAmount; }
    public void setSavedAmount(BigDecimal savedAmount) { this.savedAmount = savedAmount; }
    public LocalDate getDeadline() { return deadline; }
    public Instant getCreatedAt() { return createdAt; }
}