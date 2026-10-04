package com.arthix.backend.controller;

import com.arthix.backend.dto.InvestDtos.*;
import com.arthix.backend.service.InvestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invest")
public class InvestController {

    private final InvestService invest;

    public InvestController(InvestService invest) {
        this.invest = invest;
    }

    @GetMapping("/market")
    public List<InstrumentDto> market() { return invest.market(); }

    @GetMapping("/models")
    public List<ModelDto> models() { return invest.models(); }

    @GetMapping("/portfolio")
    public PortfolioDto portfolio(Authentication auth) { return invest.portfolio(auth.getName()); }

    @GetMapping("/orders")
    public List<OrderDto> orders(Authentication auth) { return invest.orders(auth.getName()); }

    @PostMapping("/buy")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDto buy(Authentication auth, @Valid @RequestBody TradeRequest req) { return invest.buy(auth.getName(), req); }

    @PostMapping("/sell")
    public OrderDto sell(Authentication auth, @Valid @RequestBody TradeRequest req) { return invest.sell(auth.getName(), req); }

    @PostMapping("/models/apply")
    @ResponseStatus(HttpStatus.CREATED)
    public List<OrderDto> apply(Authentication auth, @Valid @RequestBody ApplyModelRequest req) {
        return invest.applyModel(auth.getName(), req);
    }
}