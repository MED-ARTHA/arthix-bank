package com.arthix.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "invest_orders", indexes = @Index(name = "idx_invest_owner", columnList = "owner_id, created_at"))
public class InvestOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 4)
    private String side;

    @Column(nullable = false, length = 12)
    private String symbol;

    @Column(nullable = false, precision = 20, scale = 6)
    private BigDecimal units;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal price;

    @Column(nullable = false, precision = 16, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal fee;

    @Column(precision = 16, scale = 2)
    private BigDecimal pnl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected InvestOrder() {}

    public InvestOrder(User owner, String side, String symbol, BigDecimal units, BigDecimal price,
                       BigDecimal amount, BigDecimal fee, BigDecimal pnl) {
        this.owner = owner; this.side = side; this.symbol = symbol; this.units = units;
        this.price = price; this.amount = amount; this.fee = fee; this.pnl = pnl;
    }

    public Long getId() { return id; }
    public String getSide() { return side; }
    public String getSymbol() { return symbol; }
    public BigDecimal getUnits() { return units; }
    public BigDecimal getPrice() { return price; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getFee() { return fee; }
    public BigDecimal getPnl() { return pnl; }
    public Instant getCreatedAt() { return createdAt; }
}