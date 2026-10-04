package com.arthix.backend.controller;

import com.arthix.backend.service.AssistantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    public record Ask(@NotEmpty @Size(max = 30) List<AssistantService.Msg> messages) {}

    public record Answer(String reply) {}

    private final AssistantService assistant;

    public AssistantController(AssistantService assistant) {
        this.assistant = assistant;
    }

    @PostMapping
    public Answer ask(Authentication auth, @Valid @RequestBody Ask req) {
        return new Answer(assistant.reply(auth.getName(), req.messages()));
    }
}