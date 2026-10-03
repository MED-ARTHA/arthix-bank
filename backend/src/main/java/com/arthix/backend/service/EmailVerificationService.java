package com.arthix.backend.service;

import com.arthix.backend.entity.EmailVerification;
import com.arthix.backend.repository.EmailVerificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;

/** Sends and checks 6-digit email codes. Only a hash of the code is stored. */
@Service
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final int TTL_SECONDS = 600;
    private static final int COOLDOWN_SECONDS = 45;
    private static final int MAX_ATTEMPTS = 5;

    private final SecureRandom random = new SecureRandom();
    private final EmailVerificationRepository repo;
    private final ObjectProvider<JavaMailSender> mail;
    private final String username;
    private final String from;

    public EmailVerificationService(EmailVerificationRepository repo,
                                    ObjectProvider<JavaMailSender> mail,
                                    @Value("${spring.mail.username:}") String username,
                                    @Value("${app.mail.from:no-reply@arthix.local}") String from) {
        this.repo = repo;
        this.mail = mail;
        this.username = username;
        this.from = from;
    }

    public static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    @Transactional
    public void sendCode(String rawEmail) {
        String email = normalize(rawEmail);
        EmailVerification v = repo.findByEmail(email).orElseGet(() -> new EmailVerification(email));
        Instant now = Instant.now();
        if (v.getLastSentAt().isAfter(now.minusSeconds(COOLDOWN_SECONDS))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Please wait a few seconds before requesting a new code");
        }
        String code = String.format("%06d", random.nextInt(1_000_000));
        v.renew(hash(email, code), now.plusSeconds(TTL_SECONDS), now);
        repo.save(v);
        deliver(email, code);
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public void verify(String rawEmail, String code) {
        String email = normalize(rawEmail);
        EmailVerification v = repo.findByEmail(email)
            .orElseThrow(() -> bad("No code was requested for this email"));
        if (v.getExpiresAt().isBefore(Instant.now())) {
            repo.delete(v);
            throw bad("This code has expired, request a new one");
        }
        if (v.getAttempts() >= MAX_ATTEMPTS) {
            throw bad("Too many attempts, request a new code");
        }
        boolean ok = code != null && MessageDigest.isEqual(
            hash(email, code).getBytes(StandardCharsets.UTF_8),
            v.getCodeHash().getBytes(StandardCharsets.UTF_8));
        if (!ok) {
            v.addAttempt();
            repo.save(v);
            throw bad("Incorrect code");
        }
        repo.delete(v);
    }

    private void deliver(String email, String code) {
        JavaMailSender sender = mail.getIfAvailable();
        if (sender == null || username == null || username.isBlank()) {
            log.warn("[DEV] Mail is not configured. Verification code for {} is {}", email, code);
            return;
        }
        try {
            SimpleMailMessage m = new SimpleMailMessage();
            m.setFrom(from);
            m.setTo(email);
            m.setSubject("Your Arthix verification code");
            m.setText("Your Arthix verification code is: " + code
                + "\n\nIt expires in 10 minutes. If you did not request it, you can ignore this email.");
            sender.send(m);
        } catch (Exception e) {
            log.error("Could not send verification email", e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Could not send the email. Please try again later.");
        }
    }

    private static String hash(String email, String code) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest((email + ":" + code).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}