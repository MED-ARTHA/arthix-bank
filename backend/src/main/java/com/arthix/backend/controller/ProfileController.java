package com.arthix.backend.controller;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profile;

    public ProfileController(ProfileService profile) {
        this.profile = profile;
    }

    @GetMapping
    public ProfileDto get(Authentication auth) {
        return profile.get(auth.getName());
    }

    @PutMapping
    public ProfileDto update(Authentication auth, @Valid @RequestBody ProfileUpdateRequest req) {
        return profile.update(auth.getName(), req);
    }

    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void password(Authentication auth, @Valid @RequestBody PasswordChangeRequest req) {
        profile.changePassword(auth.getName(), req);
    }
}