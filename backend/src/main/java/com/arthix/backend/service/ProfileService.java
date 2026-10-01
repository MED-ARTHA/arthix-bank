package com.arthix.backend.service;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.entity.User;
import com.arthix.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfileService {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public ProfileService(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Transactional(readOnly = true)
    public ProfileDto get(String email) {
        return toDto(users.findByEmail(email).orElseThrow());
    }

    @Transactional
    public ProfileDto update(String email, ProfileUpdateRequest req) {
        User u = users.findByEmail(email).orElseThrow();
        u.setFullName(req.fullName().trim());
        String phone = req.phone() == null ? "" : req.phone().trim();
        u.setPhone(phone.isEmpty() ? null : phone);
        return toDto(u);
    }

    @Transactional
    public void changePassword(String email, PasswordChangeRequest req) {
        User u = users.findByEmail(email).orElseThrow();
        if (!encoder.matches(req.currentPassword(), u.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (encoder.matches(req.newPassword(), u.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different");
        }
        u.setPassword(encoder.encode(req.newPassword()));
    }

    private static ProfileDto toDto(User u) {
        return new ProfileDto(u.getFullName(), u.getEmail(), u.getPhone(), u.getAccountNumber(), u.getCreatedAt());
    }
}