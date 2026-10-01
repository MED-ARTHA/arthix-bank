package com.arthix.backend.controller;

import com.arthix.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api")
public class MeController {

    private final UserRepository users;

    public MeController(UserRepository users) {
        this.users = users;
    }

    public record MeResponse(String fullName, String email, BigDecimal balance, String accountNumber) {}

    @GetMapping("/me")
    public MeResponse me(Authentication auth) {
        var u = users.findByEmail(auth.getName()).orElseThrow();
        return new MeResponse(u.getFullName(), u.getEmail(), u.getBalance(), u.getAccountNumber());
    }
}