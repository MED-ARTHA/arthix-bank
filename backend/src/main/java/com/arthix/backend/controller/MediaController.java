package com.arthix.backend.controller;

import com.arthix.backend.service.MediaService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final MediaService media;

    public MediaController(MediaService media) {
        this.media = media;
    }

    /** Authenticated upload. Returns an id that can be attached to a chat message or used as an avatar. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public MediaService.Stored upload(Authentication auth,
                                      @RequestParam("file") MultipartFile file,
                                      @RequestParam(value = "purpose", defaultValue = "chat") String purpose) {
        return media.store(auth.getName(), file, "avatar".equals(purpose));
    }

    /** Public read: <img> and <video> cannot send a JWT. The id is a random UUID, so it cannot be guessed. */
    @GetMapping("/{id}")
    public ResponseEntity<Resource> get(@PathVariable String id) {
        MediaService.Served s = media.serve(id);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(s.mime()))
            .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
            .body(new FileSystemResource(s.path()));
    }
}