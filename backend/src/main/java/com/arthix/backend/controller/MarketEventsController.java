package com.arthix.backend.controller;

import com.arthix.backend.service.MarketService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/invest/events")
public class MarketEventsController {

    private final MarketService market;

    public MarketEventsController(MarketService market) {
        this.market = market;
    }

    @GetMapping
    public List<MarketService.MarketEvent> events() {
        return market.events();
    }
}