package com.arthix.backend.service;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.entity.Transaction;
import com.arthix.backend.entity.User;
import com.arthix.backend.entity.Voucher;
import com.arthix.backend.repository.TransactionRepository;
import com.arthix.backend.repository.UserRepository;
import com.arthix.backend.repository.VoucherRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class WalletService {

    private static final BigDecimal DAILY_LIMIT = new BigDecimal("50000.00");
    private static final Pattern EXPIRY = Pattern.compile("^(0[1-9]|1[0-2])/(\\d{2})$");
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RNG = new SecureRandom();

    private final UserRepository users;
    private final TransactionRepository txs;
    private final VoucherRepository vouchers;

    public WalletService(UserRepository users, TransactionRepository txs, VoucherRepository vouchers) {
        this.users = users;
        this.txs = txs;
        this.vouchers = vouchers;
    }

    // ---------- card top-up (simulation: the card is validated, never stored)
    @Transactional
    public TransactionDto depositCard(String email, DepositCardRequest req) {
        String digits = req.cardNumber().replaceAll("\\D", "");
        if (digits.length() < 13 || digits.length() > 19 || !luhn(digits)) throw bad("Invalid card number");

        Matcher m = EXPIRY.matcher(req.expiry().trim());
        if (!m.matches()) throw bad("Expiry must be MM/YY");
        YearMonth exp = YearMonth.of(2000 + Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)));
        if (exp.isBefore(YearMonth.now())) throw bad("This card has expired");
        if (!req.cvc().trim().matches("\\d{3,4}")) throw bad("Invalid security code");

        User u = users.findByEmailForUpdate(email).orElseThrow();
        BigDecimal amount = req.amount();

        Instant since = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
        BigDecimal today = txs.findByUserAndTypeAndCreatedAtAfter(u, "DEPOSIT", since).stream()
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (today.add(amount).compareTo(DAILY_LIMIT) > 0) {
            throw bad("Daily deposit limit reached (50 000 MAD)");
        }

        u.setBalance(u.getBalance().add(amount));
        String last4 = digits.substring(digits.length() - 4);
        Transaction t = txs.save(Transaction.simple(
            u, "DEPOSIT", "DEPOSIT", "Card top-up", "Card **** " + last4,
            brand(digits) + " **** " + last4, amount, u.getBalance(), code("DEP-", 8)));
        return TxMapper.toDto(t);
    }

    // ---------- cash voucher (pay at an agency, simulated)
    @Transactional(readOnly = true)
    public List<VoucherDto> vouchers(String email) {
        User u = users.findByEmail(email).orElseThrow();
        return vouchers.findTop20ByUserOrderByCreatedAtDesc(u).stream().map(WalletService::toDto).toList();
    }

    @Transactional
    public VoucherDto createVoucher(String email, VoucherRequest req) {
        User u = users.findByEmail(email).orElseThrow();
        long active = vouchers.findTop20ByUserOrderByCreatedAtDesc(u).stream()
            .filter(v -> "PENDING".equals(effective(v))).count();
        if (active >= 5) throw bad("You already have 5 active vouchers");
        Voucher v = vouchers.save(new Voucher(
            u, code("VCH-", 8), req.amount(), Instant.now().plus(48, ChronoUnit.HOURS)));
        return toDto(v);
    }

    @Transactional
    public TransactionDto redeemVoucher(String email, String rawCode) {
        User u = users.findByEmailForUpdate(email).orElseThrow();
        Voucher v = vouchers.findByCodeAndUser(rawCode.trim().toUpperCase(), u)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher not found"));
        String st = effective(v);
        if ("EXPIRED".equals(st)) throw bad("This voucher has expired");
        if (!"PENDING".equals(st)) throw bad("This voucher was already used");

        v.setStatus("PAID");
        v.setPaidAt(Instant.now());
        u.setBalance(u.getBalance().add(v.getAmount()));
        Transaction t = txs.save(Transaction.simple(
            u, "DEPOSIT", "DEPOSIT", "Cash deposit", "Voucher " + v.getCode(),
            "Cash voucher " + v.getCode(), v.getAmount(), u.getBalance(), v.getCode()));
        return TxMapper.toDto(t);
    }

    private static VoucherDto toDto(Voucher v) {
        return new VoucherDto(v.getCode(), v.getAmount(), effective(v), v.getCreatedAt(), v.getExpiresAt());
    }

    private static String effective(Voucher v) {
        if ("PENDING".equals(v.getStatus()) && Instant.now().isAfter(v.getExpiresAt())) return "EXPIRED";
        return v.getStatus();
    }

    private static String code(String prefix, int len) {
        StringBuilder sb = new StringBuilder(prefix);
        for (int i = 0; i < len; i++) sb.append(ALPHABET.charAt(RNG.nextInt(ALPHABET.length())));
        return sb.toString();
    }

    private static boolean luhn(String d) {
        int sum = 0;
        boolean alt = false;
        for (int i = d.length() - 1; i >= 0; i--) {
            int n = d.charAt(i) - '0';
            if (alt) {
                n *= 2;
                if (n > 9) n -= 9;
            }
            sum += n;
            alt = !alt;
        }
        return sum % 10 == 0;
    }

    private static String brand(String d) {
        if (d.startsWith("4")) return "Visa";
        if (d.startsWith("5") || d.startsWith("2")) return "Mastercard";
        if (d.startsWith("34") || d.startsWith("37")) return "Amex";
        return "Card";
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}