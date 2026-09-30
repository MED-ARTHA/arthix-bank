package com.arthix.backend.dto;

import jakarta.validation.constraints.*;

public class AuthDtos {

    public record SignupRequest(
        @NotBlank String fullName,
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password
    ) {}

    public record LoginRequest(
        @Email @NotBlank String email,
        @NotBlank String password
    ) {}

    public record AuthResponse(String token, String fullName, String email) {}
}