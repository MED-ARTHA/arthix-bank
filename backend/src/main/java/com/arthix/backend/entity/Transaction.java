package com.arthix.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private String reference;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal balanceAfter;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(length = 20)
    private String type;

    @Column(length = 120)
    private String counterpartyName;

    @Column(length = 20)
    private String counterpartyAccount;

    @Column(length = 100)
    private String note;

    @Column(length = 24)
    private String transferRef;

    protected Transaction() {}

    public Transaction(User user, String category, String label, String reference,
                       BigDecimal amount, BigDecimal balanceAfter) {
        this.user = user;
        this.category = category;
        this.label = label;
        this.reference = reference;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.type = "PAYMENT";
    }

    public static Transaction transfer(User owner, boolean outgoing, User other, BigDecimal amount,
                                       BigDecimal balanceAfter, String note, String ref) {
        String clean = (note == null || note.isBlank()) ? null : note.trim();
        Transaction t = new Transaction(
            owner,
            "TRANSFER",
            (outgoing ? "Transfer to " : "Transfer from ") + other.getFullName(),
            clean != null ? clean : "Virement",
            amount,
            balanceAfter);
        t.type = outgoing ? "TRANSFER_OUT" : "TRANSFER_IN";
        t.counterpartyName = other.getFullName();
        t.counterpartyAccount = other.getAccountNumber();
        t.note = clean;
        t.transferRef = ref;
        return t;
    }

    public static Transaction simple(User owner, String type, String category, String label,
                                     String reference, String counterpartyName,
                                     BigDecimal amount, BigDecimal balanceAfter, String ref) {
        Transaction t = new Transaction(owner, category, label, reference, amount, balanceAfter);
        t.type = type;
        t.counterpartyName = counterpartyName;
        t.transferRef = ref;
        return t;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getCategory() { return category; }
    public String getLabel() { return label; }
    public String getReference() { return reference; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public Instant getCreatedAt() { return createdAt; }
    public String getType() { return type; }
    public String getCounterpartyName() { return counterpartyName; }
    public String getCounterpartyAccount() { return counterpartyAccount; }
    public String getNote() { return note; }
    public String getTransferRef() { return transferRef; }
}