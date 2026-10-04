package com.arthix.backend.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/** Simulated market. Prices follow a mean-reverting random walk, updated every 5 seconds. Demo only. */
@Service
public class MarketService {

    public record Instrument(String symbol, String name, String category, int risk, String description,
                             double base, double vol, double drift) {}

    private static final int POINTS = 72;

    public static final List<Instrument> ALL = List.of(
        new Instrument("BND", "Sovereign Bonds MA", "Bonds", 1, "Moroccan treasury bonds. Stable income, low volatility.", 100, 0.0015, 0.00003),
        new Instrument("BNDG", "Euro Corporate Bonds", "Bonds", 2, "Investment-grade company debt across the eurozone.", 84, 0.0025, 0.00003),
        new Instrument("GOLD", "Gold Reserve", "Commodities", 2, "Physical gold exposure. A classic safe haven.", 640, 0.0035, 0.00004),
        new Instrument("REIT", "Atlas Real Estate", "Real estate", 2, "Offices, retail and housing across Moroccan cities.", 212, 0.003, 0.00004),
        new Instrument("ATL20", "Atlas Morocco 20", "Equities", 3, "The 20 largest listed Moroccan companies.", 156, 0.0045, 0.00005),
        new Instrument("CASA", "Casablanca Blue Chips", "Equities", 3, "Dividend-paying leaders of the Casablanca exchange.", 98, 0.0045, 0.00005),
        new Instrument("WLD", "Global Equity Index", "Equities", 3, "Thousands of companies across developed markets.", 320, 0.004, 0.00006),
        new Instrument("TECH", "Nova Tech Leaders", "Equities", 4, "Fast-growing technology and software companies.", 275, 0.0075, 0.00008),
        new Instrument("GRN", "Green Energy Fund", "Equities", 4, "Solar, wind and storage: the energy transition.", 118, 0.0072, 0.00007),
        new Instrument("DIGI", "Digital Asset Basket", "Digital", 5, "A basket of leading digital assets. Very volatile.", 450, 0.012, 0.0001)
    );

    private final Map<String, Deque<Double>> hist = new LinkedHashMap<>();

    public MarketService() {
        for (Instrument i : ALL) {
            Deque<Double> d = new ArrayDeque<>();
            double p = i.base();
            for (int k = 0; k < POINTS; k++) { p = step(i, p); d.addLast(p); }
            hist.put(i.symbol(), d);
        }
    }

    private static double step(Instrument i, double p) {
        double z = ThreadLocalRandom.current().nextGaussian();
        double r = i.drift() - 0.5 * i.vol() * i.vol() + i.vol() * z;
        r -= 0.012 * Math.log(p / i.base());
        return Math.max(1, p * Math.exp(r));
    }

    @Scheduled(fixedRate = 5000, initialDelay = 5000)
    public synchronized void tick() {
        for (Instrument i : ALL) {
            Deque<Double> d = hist.get(i.symbol());
            d.addLast(step(i, d.getLast()));
            while (d.size() > POINTS) d.removeFirst();
        }
    }

    public Optional<Instrument> find(String symbol) {
        if (symbol == null) return Optional.empty();
        String s = symbol.trim().toUpperCase();
        return ALL.stream().filter(i -> i.symbol().equals(s)).findFirst();
    }

    public synchronized BigDecimal price(String symbol) {
        return BigDecimal.valueOf(hist.get(symbol).getLast()).setScale(2, RoundingMode.HALF_UP);
    }

    public synchronized List<Double> history(String symbol) {
        return hist.get(symbol).stream().map(v -> Math.round(v * 100) / 100.0).toList();
    }

    public synchronized double changePct(String symbol) {
        Deque<Double> d = hist.get(symbol);
        return (d.getLast() / d.getFirst() - 1) * 100;
    }
}