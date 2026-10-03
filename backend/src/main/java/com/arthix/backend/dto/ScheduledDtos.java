package com.arthix.backend.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;

public class ScheduledDtos {

    public record ScheduledRequest(
        @NotBlank @Size(max = 30) String toAccount,
        @NotNull @DecimalMin(value = "0.01", message = "Amount must be positive")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount,
        @Size(max = 100, message = "Note is too long (100 characters max)") String note,
        @NotBlank @Pattern(regexp = "ONCE|WEEKLY|MONTHLY", message = "Invalid frequency") String frequency,
        @NotNull Instant firstRun
    ) {}

    public record ScheduledDto(Long id, String toAccount, BigDecimal amount, String note,
                               String frequency, Instant nextRun, String status, String lastError) {}
}