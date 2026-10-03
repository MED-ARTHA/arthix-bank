package com.arthix.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "scheduled_transfers", indexes = {
    @Index(name = "idx_sched_due", columnList = "status, next_run")
})
public class ScheduledTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "to_account", nullable = false, length = 30)
    private String toAccount;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(length = 100)
    private String note;

    @Column(nullable = false, length = 10)
    private String frequency;

    @Column(name = "next_run", nullable = false)
    private Instant nextRun;

    @Column(nullable = false, length = 10)
    private String status = "ACTIVE";

    @Column(name = "last_error", length = 200)
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected ScheduledTransfer() {}

    public ScheduledTransfer(User owner, String toAccount, BigDecimal amount, String note,
                             String frequency, Instant nextRun) {
        this.owner = owner;
        this.toAccount = toAccount;
        this.amount = amount;
        this.note = note;
        this.frequency = frequency;
        this.nextRun = nextRun;
    }

    public Long getId() { return id; }
    public User getOwner() { return owner; }
    public String getToAccount() { return toAccount; }
    public BigDecimal getAmount() { return amount; }
    public String getNote() { return note; }
    public String getFrequency() { return frequency; }
    public Instant getNextRun() { return nextRun; }
    public String getStatus() { return status; }
    public String getLastError() { return lastError; }
    public Instant getCreatedAt() { return createdAt; }

    public void setNextRun(Instant nextRun) { this.nextRun = nextRun; }
    public void setStatus(String status) { this.status = status; }
    public void setLastError(String lastError) { this.lastError = lastError; }
}