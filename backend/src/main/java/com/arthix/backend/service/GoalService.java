package com.arthix.backend.service;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.entity.SavingsGoal;
import com.arthix.backend.entity.Transaction;
import com.arthix.backend.entity.User;
import com.arthix.backend.repository.SavingsGoalRepository;
import com.arthix.backend.repository.TransactionRepository;
import com.arthix.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class GoalService {

    private final UserRepository users;
    private final SavingsGoalRepository goals;
    private final TransactionRepository txs;

    public GoalService(UserRepository users, SavingsGoalRepository goals, TransactionRepository txs) {
        this.users = users;
        this.goals = goals;
        this.txs = txs;
    }

    @Transactional(readOnly = true)
    public List<GoalDto> list(String email) {
        User u = users.findByEmail(email).orElseThrow();
        return goals.findByUserOrderByCreatedAtDesc(u).stream().map(GoalService::toDto).toList();
    }

    @Transactional
    public GoalDto create(String email, GoalRequest req) {
        User u = users.findByEmail(email).orElseThrow();
        if (goals.findByUserOrderByCreatedAtDesc(u).size() >= 10) throw bad("You can have up to 10 goals");
        if (req.deadline() != null && !req.deadline().isAfter(LocalDate.now())) {
            throw bad("Deadline must be in the future");
        }
        SavingsGoal g = goals.save(new SavingsGoal(u, req.name().trim(), req.targetAmount(), req.deadline()));
        return toDto(g);
    }

    @Transactional
    public GoalDto deposit(String email, Long id, BigDecimal amount) {
        User u = users.findByEmailForUpdate(email).orElseThrow();
        SavingsGoal g = find(u, id);
        if (u.getBalance().compareTo(amount) < 0) throw bad("Insufficient balance");

        u.setBalance(u.getBalance().subtract(amount));
        g.setSavedAmount(g.getSavedAmount().add(amount));
        txs.save(Transaction.simple(u, "SAVINGS_OUT", "SAVINGS", "Saved to " + g.getName(),
            "Savings goal", "Goal: " + g.getName(), amount, u.getBalance(), ref()));
        return toDto(g);
    }

    @Transactional
    public GoalDto withdraw(String email, Long id, BigDecimal amount) {
        User u = users.findByEmailForUpdate(email).orElseThrow();
        SavingsGoal g = find(u, id);
        if (g.getSavedAmount().compareTo(amount) < 0) throw bad("Not enough saved in this goal");

        g.setSavedAmount(g.getSavedAmount().subtract(amount));
        u.setBalance(u.getBalance().add(amount));
        txs.save(Transaction.simple(u, "SAVINGS_IN", "SAVINGS", "Withdrawn from " + g.getName(),
            "Savings goal", "Goal: " + g.getName(), amount, u.getBalance(), ref()));
        return toDto(g);
    }

    @Transactional
    public void delete(String email, Long id) {
        User u = users.findByEmailForUpdate(email).orElseThrow();
        SavingsGoal g = find(u, id);
        BigDecimal saved = g.getSavedAmount();
        if (saved.signum() > 0) {
            u.setBalance(u.getBalance().add(saved));
            txs.save(Transaction.simple(u, "SAVINGS_IN", "SAVINGS", "Closed goal " + g.getName(),
                "Savings goal", "Goal: " + g.getName(), saved, u.getBalance(), ref()));
        }
        goals.delete(g);
    }

    private SavingsGoal find(User u, Long id) {
        return goals.findByIdAndUser(id, u)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));
    }

    private static GoalDto toDto(SavingsGoal g) {
        return new GoalDto(g.getId(), g.getName(), g.getTargetAmount(), g.getSavedAmount(),
            g.getDeadline(), g.getCreatedAt());
    }

    private static String ref() {
        return "SAV-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}