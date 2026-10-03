package com.arthix.backend.controller;

import com.arthix.backend.entity.MediaFile;
import com.arthix.backend.entity.User;
import com.arthix.backend.repository.UserRepository;
import com.arthix.backend.service.MediaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/profile/avatar")
public class AvatarController {

    public record AvatarRequest(@NotBlank String mediaId) {}

    private final UserRepository users;
    private final MediaService media;

    public AvatarController(UserRepository users, MediaService media) {
        this.users = users;
        this.media = media;
    }

    @PutMapping
    @Transactional
    public Map<String, String> set(Authentication auth, @Valid @RequestBody AvatarRequest req) {
        User u = users.findByEmail(auth.getName()).orElseThrow();
        MediaFile f = media.requireOwned(u, req.mediaId().trim());
        if (!"image".equals(f.getKind())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please choose an image");
        }
        u.setAvatarUrl(MediaService.urlOf(f));
        return Map.of("avatarUrl", u.getAvatarUrl());
    }

    @DeleteMapping
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clear(Authentication auth) {
        users.findByEmail(auth.getName()).orElseThrow().setAvatarUrl(null);
    }
}