package com.arthix.backend.controller;

import com.arthix.backend.dto.ScheduledDtos.*;
import com.arthix.backend.service.ScheduledService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scheduled")
public class ScheduledController {

    private final ScheduledService scheduled;

    public ScheduledController(ScheduledService scheduled) {
        this.scheduled = scheduled;
    }

    @GetMapping
    public List<ScheduledDto> list(Authentication auth) {
        return scheduled.list(auth.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduledDto create(Authentication auth, @Valid @RequestBody ScheduledRequest req) {
        return scheduled.create(auth.getName(), req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(Authentication auth, @PathVariable Long id) {
        scheduled.cancel(auth.getName(), id);
    }
}