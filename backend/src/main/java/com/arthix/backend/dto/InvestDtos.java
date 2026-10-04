package com.arthix.backend.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class InvestDtos {

    public record InstrumentDto(String symbol, String name, String category, int risk, String description,
                                BigDecimal price, double changePct, List<Double> history) {}

    public record HoldingDto(String symbol, String name, String category, BigDecimal units, BigDecimal avgPrice,
                             BigDecimal price, BigDecimal value, BigDecimal cost, BigDecimal pnl, double pnlPct,
                             List<Double> history) {}

    public record AllocDto(String category, BigDecimal value) {}

    public record PortfolioDto(BigDecimal cash, BigDecimal invested, BigDecimal cost, BigDecimal pnl, double pnlPct,
                               BigDecimal total, List<HoldingDto> holdings, List<AllocDto> allocation) {}

    public record OrderDto(Long id, String side, String symbol, String name, BigDecimal units, BigDecimal price,
                           BigDecimal amount, BigDecimal fee, BigDecimal pnl, Instant createdAt) {}

    public record TradeRequest(
        @NotBlank String symbol,
        @DecimalMin(value = "0.01", message = "Amount must be positive")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount,
        Boolean all
    ) {}

    public record ModelPart(String symbol, String name, int pct) {}

    public record ModelDto(String id, String name, String tagline, int risk, double expectedReturn,
                           int minAmount, List<ModelPart> parts) {}

    public record ApplyModelRequest(
        @NotBlank String model,
        @NotNull @DecimalMin(value = "50.00", message = "Minimum is 50 MAD")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount
    ) {}
}