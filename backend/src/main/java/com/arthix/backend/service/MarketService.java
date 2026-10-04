package com.arthix.backend.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;

/** Simulated market. Prices follow a mean-reverting random walk (every 5 s) plus random news events. Demo only. */
@Service
public class MarketService {

    public record Instrument(String symbol, String name, String category, int risk, String description,
                             double base, double vol, double drift) {}

    public record MarketEvent(long id, String headline, String detail, String tone,
                              List<String> symbols, double impactPct, Instant at) {}

    private record Template(String headline, String detail, double impact, List<String> symbols) {}

    private static final int POINTS = 72;
    private static final int MAX_EVENTS = 15;

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

    private static final List<Template> TEMPLATES = List.of(
        new Template("Central bank keeps rates unchanged", "Policymakers signal patience; bond markets welcome the stability.", 0.8, List.of("BND", "BNDG")),
        new Template("Rate hike surprises investors", "A larger than expected increase weighs on bonds, property and growth stocks.", -2.0, List.of("BND", "BNDG", "REIT", "TECH")),
        new Template("Inflation cools faster than expected", "Lower prices raise hopes of cheaper credit.", 1.4, List.of("BND", "BNDG", "WLD")),
        new Template("Gold reaches a record high", "Safe-haven demand surges amid global uncertainty.", 2.6, List.of("GOLD")),
        new Template("Tech earnings beat forecasts", "Cloud and AI revenues lift the whole sector.", 3.2, List.of("TECH", "WLD")),
        new Template("Supply chain disruption hits tech", "Component shortages delay product launches.", -3.5, List.of("TECH")),
        new Template("Digital asset ETF approved", "Regulators open the door to institutional money.", 7.0, List.of("DIGI")),
        new Template("Regulators tighten digital asset rules", "New compliance costs spook the market.", -6.5, List.of("DIGI")),
        new Template("Energy transition plan announced", "A new subsidy package boosts solar and storage.", 3.6, List.of("GRN")),
        new Template("Oil price shock rattles markets", "Equities fall while clean energy benefits.", -2.0, List.of("WLD", "ATL20", "CASA")),
        new Template("Housing demand surges in Casablanca", "Record transactions lift property valuations.", 2.2, List.of("REIT")),
        new Template("Casablanca bourse rallies on dividends", "Strong payouts attract local and foreign buyers.", 2.3, List.of("CASA", "ATL20"))
    );

    private final Map<String, Deque<Double>> hist = new LinkedHashMap<>();
    private final Deque<MarketEvent> events = new ArrayDeque<>();
    private final AtomicLong seq = new AtomicLong();

    public MarketService() {
        for (Instrument i : ALL) {
            Deque<Double> d = new ArrayDeque<>();
            double p = i.base();
            for (int k = 0; k < POINTS; k++) { p = step(i, p); d.addLast(p); }
            hist.put(i.symbol(), d);
        }
        for (int k = 0; k < 3; k++) {
            Template t = TEMPLATES.get(ThreadLocalRandom.current().nextInt(TEMPLATES.size()));
            record(t, t.impact(), Instant.now().minusSeconds((3 - k) * 600L));
        }
    }

    private static double step(Instrument i, double p) {
        double z = ThreadLocalRandom.current().nextGaussian();
        double r = i.drift() - 0.5 * i.vol() * i.vol() + i.vol() * z;
        r -= 0.012 * Math.log(p / i.base());
        return Math.max(1, p * Math.exp(r));
    }

    private void record(Template t, double impact, Instant at) {
        events.addFirst(new MarketEvent(seq.incrementAndGet(), t.headline(), t.detail(),
            impact >= 0 ? "up" : "down", t.symbols(), Math.round(impact * 10) / 10.0, at));
        while (events.size() > MAX_EVENTS) events.removeLast();
    }

    @Scheduled(fixedRate = 5000, initialDelay = 5000)
    public synchronized void tick() {
        for (Instrument i : ALL) {
            Deque<Double> d = hist.get(i.symbol());
            d.addLast(step(i, d.getLast()));
            while (d.size() > POINTS) d.removeFirst();
        }
    }

    /** A news event shifts the price of the instruments it concerns; mean reversion then slowly absorbs it. */
    @Scheduled(fixedRate = 40_000, initialDelay = 20_000)
    public synchronized void fireEvent() {
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        if (rnd.nextDouble() > 0.75) return;
        Template t = TEMPLATES.get(rnd.nextInt(TEMPLATES.size()));
        double impact = t.impact() * (0.7 + rnd.nextDouble() * 0.6);
        for (String s : t.symbols()) {
            Deque<Double> d = hist.get(s);
            d.addLast(d.removeLast() * (1 + impact / 100));
        }
        record(t, impact, Instant.now());
    }

    public synchronized List<MarketEvent> events() { return List.copyOf(events); }

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