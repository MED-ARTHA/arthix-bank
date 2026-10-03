package com.arthix.backend.controller;

import com.arthix.backend.dto.AuthDtos.*;
import com.arthix.backend.repository.UserRepository;
import com.arthix.backend.service.AuthService;
import com.arthix.backend.service.EmailVerificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record CodeSent(String email, int expiresInMinutes) {}

    public record ResendRequest(@Email @NotBlank String email) {}

    public record VerifyRequest(
        @NotBlank @Size(max = 80) String fullName,
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "The code has 6 digits") String code
    ) {}

    private final AuthService auth;
    private final UserRepository users;
    private final EmailVerificationService verification;

    public AuthController(AuthService auth, UserRepository users, EmailVerificationService verification) {
        this.auth = auth;
        this.users = users;
        this.verification = verification;
    }

    /** Step 1: validates the data and emails a code. The account is NOT created yet. */
    @PostMapping("/signup")
    public CodeSent signup(@Valid @RequestBody SignupRequest req) {
        String email = EmailVerificationService.normalize(req.email());
        ensureFree(email);
        verification.sendCode(email);
        return new CodeSent(email, 10);
    }

    @PostMapping("/resend")
    public CodeSent resend(@Valid @RequestBody ResendRequest req) {
        String email = EmailVerificationService.normalize(req.email());
        ensureFree(email);
        verification.sendCode(email);
        return new CodeSent(email, 10);
    }

    /** Step 2: checks the code, then creates the account and returns the JWT. */
    @PostMapping("/verify")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse verify(@Valid @RequestBody VerifyRequest req) {
        String email = EmailVerificationService.normalize(req.email());
        ensureFree(email);
        verification.verify(email, req.code());
        return auth.signup(new SignupRequest(req.fullName().trim(), email, req.password()));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    private void ensureFree(String email) {
        if (users.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
    }
}