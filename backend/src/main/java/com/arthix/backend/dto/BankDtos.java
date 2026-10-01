package com.arthix.backend.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public class BankDtos {

    public record PaymentRequest(
        @NotBlank String provider,
        @NotBlank @Size(max = 50) String reference,
        @NotNull @DecimalMin(value = "0.01", message = "Amount must be positive")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount
    ) {}

    public record TransferRequest(
        @NotBlank @Size(max = 30) String toAccount,
        @NotNull @DecimalMin(value = "0.01", message = "Amount must be positive")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount,
        @Size(max = 100, message = "Note is too long (100 characters max)") String note
    ) {}

    public record RecipientDto(String fullName, String accountNumber) {}

    public record TransactionDto(Long id, String type, String category, String label, String reference,
                                 BigDecimal amount, BigDecimal balanceAfter, Instant createdAt,
                                 String receiptNo,
                                 String senderName, String senderAccount,
                                 String beneficiaryName, String beneficiaryAccount,
                                 String note) {}

    public record ProviderDto(String id, String name, String category) {}

    public record OfferDto(String title, String description) {}

    // ----- deposits
    public record DepositCardRequest(
        @NotBlank String cardNumber,
        @NotBlank String expiry,
        @NotBlank String cvc,
        @NotBlank @Size(max = 60) String holder,
        @NotNull @DecimalMin(value = "10.00", message = "Minimum deposit is 10 MAD")
        @DecimalMax(value = "20000.00", message = "Maximum per deposit is 20 000 MAD")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount
    ) {}

    public record VoucherRequest(
        @NotNull @DecimalMin(value = "50.00", message = "Minimum voucher is 50 MAD")
        @DecimalMax(value = "10000.00", message = "Maximum voucher is 10 000 MAD")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount
    ) {}

    public record VoucherDto(String code, BigDecimal amount, String status, Instant createdAt, Instant expiresAt) {}

    // ----- goals
    public record GoalRequest(
        @NotBlank @Size(max = 40, message = "Name is too long (40 characters max)") String name,
        @NotNull @DecimalMin(value = "1.00", message = "Target must be at least 1 MAD")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal targetAmount,
        LocalDate deadline
    ) {}

    public record GoalMoveRequest(
        @NotNull @DecimalMin(value = "0.01", message = "Amount must be positive")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount
    ) {}

    public record GoalDto(Long id, String name, BigDecimal targetAmount, BigDecimal savedAmount,
                          LocalDate deadline, Instant createdAt) {}

    // ----- profile
    public record ProfileDto(String fullName, String email, String phone, String accountNumber, Instant createdAt) {}

    public record ProfileUpdateRequest(
        @NotBlank @Size(max = 80, message = "Name is too long") String fullName,
        @Pattern(regexp = "^$|^\\+?[0-9 ]{8,15}$", message = "Invalid phone number") String phone
    ) {}

    public record PasswordChangeRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, message = "New password must be at least 8 characters") String newPassword
    ) {}
}