package com.arthix.backend.service;

import com.arthix.backend.dto.BankDtos.TransferRequest;
import com.arthix.backend.dto.ScheduledDtos.*;
import com.arthix.backend.entity.ScheduledTransfer;
import com.arthix.backend.entity.User;
import com.arthix.backend.repository.ScheduledTransferRepository;
import com.arthix.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class ScheduledService {

    private final ScheduledTransferRepository repo;
    private final UserRepository users;
    private final BankService bank;

    public ScheduledService(ScheduledTransferRepository repo, UserRepository users, BankService bank) {
        this.repo = repo;
        this.users = users;
        this.bank = bank;
    }

    @Transactional(readOnly = true)
    public List<ScheduledDto> list(String email) {
        User me = users.findByEmail(email).orElseThrow();
        return repo.findByOwnerOrderByNextRunAsc(me).stream().map(ScheduledService::toDto).toList();
    }

    @Transactional
    public ScheduledDto create(String email, ScheduledRequest req) {
        User me = users.findByEmail(email).orElseThrow();
        if (req.firstRun().isBefore(Instant.now().minusSeconds(60))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The date must be in the future");
        }
        String to = req.toAccount().replaceAll("\\s+", "").toUpperCase();
        if (to.equals(me.getAccountNumber())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot schedule a transfer to yourself");
        }
        if (users.findByAccountNumber(to).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient not found");
        }
        String note = req.note() == null || req.note().isBlank() ? null : req.note().trim();
        ScheduledTransfer s = repo.save(
            new ScheduledTransfer(me, to, req.amount(), note, req.frequency(), req.firstRun()));
        return toDto(s);
    }

    @Transactional
    public void cancel(String email, Long id) {
        User me = users.findByEmail(email).orElseThrow();
        ScheduledTransfer s = repo.findById(id)
            .filter(x -> x.getOwner().getId().equals(me.getId()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found"));
        repo.delete(s);
    }

    /** Runs every 30 seconds; each due transfer goes through the normal BankService.transfer. */
    @Scheduled(fixedDelay = 30_000, initialDelay = 15_000)
    public void runDue() {
        List<ScheduledTransfer> due = repo.findByStatusAndNextRunLessThanEqual("ACTIVE", Instant.now());
        for (ScheduledTransfer s : due) {
            try {
                bank.transfer(s.getOwner().getEmail(),
                    new TransferRequest(s.getToAccount(), s.getAmount(), s.getNote()));
                s.setLastError(null);
                switch (s.getFrequency()) {
                    case "WEEKLY" -> s.setNextRun(s.getNextRun().plusSeconds(7L * 24 * 3600));
                    case "MONTHLY" -> s.setNextRun(
                        s.getNextRun().atZone(ZoneOffset.UTC).plusMonths(1).toInstant());
                    default -> s.setStatus("DONE");
                }
            } catch (Exception e) {
                s.setStatus("FAILED");
                String msg = e instanceof ResponseStatusException r && r.getReason() != null
                    ? r.getReason() : "Transfer failed";
                s.setLastError(msg.length() > 190 ? msg.substring(0, 190) : msg);
            }
            repo.save(s);
        }
    }

    private static ScheduledDto toDto(ScheduledTransfer s) {
        return new ScheduledDto(s.getId(), s.getToAccount(), s.getAmount(), s.getNote(),
            s.getFrequency(), s.getNextRun(), s.getStatus(), s.getLastError());
    }
}