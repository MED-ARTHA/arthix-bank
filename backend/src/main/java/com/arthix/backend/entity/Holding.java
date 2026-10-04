package com.arthix.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "holdings", uniqueConstraints = @UniqueConstraint(columnNames = {"owner_id", "symbol"}))
public class Holding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 12)
    private String symbol;

    @Column(nullable = false, precision = 20, scale = 6)
    private BigDecimal units = BigDecimal.ZERO;

    /** Total MAD invested in the units currently held (net of fees). */
    @Column(nullable = false, precision = 16, scale = 2)
    private BigDecimal cost = BigDecimal.ZERO;

    protected Holding() {}

    public Holding(User owner, String symbol) {
        this.owner = owner;
        this.symbol = symbol;
    }

    public void add(BigDecimal u, BigDecimal c) { units = units.add(u); cost = cost.add(c); }
    public void remove(BigDecimal u, BigDecimal c) { units = units.subtract(u); cost = cost.subtract(c); }

    public Long getId() { return id; }
    public User getOwner() { return owner; }
    public String getSymbol() { return symbol; }
    public BigDecimal getUnits() { return units; }
    public BigDecimal getCost() { return cost; }
}