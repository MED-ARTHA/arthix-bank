package com.arthix.backend.controller;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.service.BankService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class BankController {

    private final BankService bank;

    public BankController(BankService bank) {
        this.bank = bank;
    }

    @GetMapping("/providers")
    public List<ProviderDto> providers() {
        return bank.providers();
    }

    @GetMapping("/offers")
    public List<OfferDto> offers() {
        return bank.offers();
    }

    @GetMapping("/transactions")
    public List<TransactionDto> transactions(Authentication auth) {
        return bank.transactions(auth.getName());
    }

    @PostMapping("/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionDto pay(Authentication auth, @Valid @RequestBody PaymentRequest req) {
        return bank.pay(auth.getName(), req);
    }
}