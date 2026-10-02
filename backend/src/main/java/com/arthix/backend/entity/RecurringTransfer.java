package com.arthix.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "recurring_transfers", indexes = {
    @Index(name = "idx_recurring_due", columnList = "active, next_execution_date"),
    @Index(name = "idx_recurring_sender", columnList = "sender_id, created_at")
})
public class RecurringTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(length = 140)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", nullable = false, length = 10)
    private Frequency frequency;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "next_execution_date", nullable = false)
    private LocalDate nextExecutionDate;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected RecurringTransfer() {}

    public RecurringTransfer(User sender, User recipient, BigDecimal amount, String description,
                             Frequency frequency, LocalDate startDate, LocalDate endDate) {
        this.sender = sender;
        this.recipient = recipient;
        this.amount = amount;
        this.description = description;
        this.frequency = frequency;
        this.startDate = startDate;
        this.endDate = endDate;
        this.nextExecutionDate = startDate;
    }

    public Long getId() { return id; }
    public User getSender() { return sender; }
    public User getRecipient() { return recipient; }
    public BigDecimal getAmount() { return amount; }
    public String getDescription() { return description; }
    public Frequency getFrequency() { return frequency; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public LocalDate getNextExecutionDate() { return nextExecutionDate; }
    public void setNextExecutionDate(LocalDate nextExecutionDate) { this.nextExecutionDate = nextExecutionDate; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
}