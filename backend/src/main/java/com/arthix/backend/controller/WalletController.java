package com.arthix.backend.controller;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deposits")
public class WalletController {

    private final WalletService wallet;

    public WalletController(WalletService wallet) {
        this.wallet = wallet;
    }

    @PostMapping("/card")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionDto card(Authentication auth, @Valid @RequestBody DepositCardRequest req) {
        return wallet.depositCard(auth.getName(), req);
    }

    @GetMapping("/vouchers")
    public List<VoucherDto> vouchers(Authentication auth) {
        return wallet.vouchers(auth.getName());
    }

    @PostMapping("/vouchers")
    @ResponseStatus(HttpStatus.CREATED)
    public VoucherDto createVoucher(Authentication auth, @Valid @RequestBody VoucherRequest req) {
        return wallet.createVoucher(auth.getName(), req);
    }

    @PostMapping("/vouchers/{code}/redeem")
    public TransactionDto redeem(Authentication auth, @PathVariable String code) {
        return wallet.redeemVoucher(auth.getName(), code);
    }
}