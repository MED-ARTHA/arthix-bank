package com.arthix.backend.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "email_verifications")
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash = "";

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt = Instant.EPOCH;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(name = "last_sent_at", nullable = false)
    private Instant lastSentAt = Instant.EPOCH;

    protected EmailVerification() {}

    public EmailVerification(String email) {
        this.email = email;
    }

    public void renew(String codeHash, Instant expiresAt, Instant now) {
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
        this.lastSentAt = now;
        this.attempts = 0;
    }

    public void addAttempt() { this.attempts++; }

    public String getEmail() { return email; }
    public String getCodeHash() { return codeHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public int getAttempts() { return attempts; }
    public Instant getLastSentAt() { return lastSentAt; }
}