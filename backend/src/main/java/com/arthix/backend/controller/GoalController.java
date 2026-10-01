package com.arthix.backend.controller;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.service.GoalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalService goals;

    public GoalController(GoalService goals) {
        this.goals = goals;
    }

    @GetMapping
    public List<GoalDto> list(Authentication auth) {
        return goals.list(auth.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GoalDto create(Authentication auth, @Valid @RequestBody GoalRequest req) {
        return goals.create(auth.getName(), req);
    }

    @PostMapping("/{id}/deposit")
    public GoalDto deposit(Authentication auth, @PathVariable Long id, @Valid @RequestBody GoalMoveRequest req) {
        return goals.deposit(auth.getName(), id, req.amount());
    }

    @PostMapping("/{id}/withdraw")
    public GoalDto withdraw(Authentication auth, @PathVariable Long id, @Valid @RequestBody GoalMoveRequest req) {
        return goals.withdraw(auth.getName(), id, req.amount());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication auth, @PathVariable Long id) {
        goals.delete(auth.getName(), id);
    }
}