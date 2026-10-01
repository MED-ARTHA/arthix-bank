package com.arthix.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal balance = new BigDecimal("1000.00");

    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    public Instant getCreatedAt() { return createdAt; }

    @Column(unique = true, length = 20)
    private String accountNumber;

    public String getAccountNumber() { return accountNumber; }

    @PrePersist
    void generateAccountNumber() {
        if (accountNumber == null) {
            long n = java.util.concurrent.ThreadLocalRandom.current()
                    .nextLong(1_000_000_000_000L, 9_999_999_999_999L);
            accountNumber = "ARX" + n;
        }
    }
    @Column(length = 20)
    private String phone;

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }}
