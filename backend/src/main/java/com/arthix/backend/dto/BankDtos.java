package com.arthix.backend.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;

public class BankDtos {

    public record PaymentRequest(
        @NotBlank String provider,
        @NotBlank @Size(max = 50) String reference,
        @NotNull @DecimalMin(value = "0.01", message = "Amount must be positive")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount
    ) {}

    public record TransactionDto(Long id, String category, String label, String reference,
                                 BigDecimal amount, BigDecimal balanceAfter, Instant createdAt) {}

    public record ProviderDto(String id, String name, String category) {}

    public record OfferDto(String title, String description) {}
}