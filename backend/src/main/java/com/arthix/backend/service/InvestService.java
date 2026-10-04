package com.arthix.backend.service;

import com.arthix.backend.dto.InvestDtos.*;
import com.arthix.backend.entity.Holding;
import com.arthix.backend.entity.InvestOrder;
import com.arthix.backend.entity.User;
import com.arthix.backend.repository.HoldingRepository;
import com.arthix.backend.repository.InvestOrderRepository;
import com.arthix.backend.repository.UserRepository;
import com.arthix.backend.repository.WalletRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class InvestService {

    private static final BigDecimal FEE = new BigDecimal("0.002");
    private static final BigDecimal MIN = new BigDecimal("50.00");
    private static final BigDecimal MAX = new BigDecimal("200000.00");

    private static final List<ModelDto> MODELS = List.of(
        model("prudent", "Prudent", "Protect your capital, steady growth.", 1, 3.5, List.of(
            part("BND", 45), part("BNDG", 20), part("GOLD", 15), part("REIT", 10), part("ATL20", 10))),
        model("balanced", "Balanced", "A mix of growth and stability.", 3, 6.0, List.of(
            part("WLD", 30), part("ATL20", 20), part("BND", 20), part("GOLD", 10), part("REIT", 10), part("CASA", 10))),
        model("dynamic", "Dynamic", "Higher growth, accepts larger swings.", 4, 9.0, List.of(
            part("TECH", 25), part("WLD", 25), part("GRN", 15), part("CASA", 15), part("DIGI", 10), part("GOLD", 10)))
    );

    private final UserRepository users;
    private final WalletRepository wallet;
    private final HoldingRepository holdings;
    private final InvestOrderRepository orders;
    private final MarketService market;

    public InvestService(UserRepository users, WalletRepository wallet, HoldingRepository holdings,
                         InvestOrderRepository orders, MarketService market) {
        this.users = users;
        this.wallet = wallet;
        this.holdings = holdings;
        this.orders = orders;
        this.market = market;
    }

    // ---------------- read ----------------

    public List<InstrumentDto> market() {
        return MarketService.ALL.stream().map(i -> new InstrumentDto(
            i.symbol(), i.name(), i.category(), i.risk(), i.description(),
            market.price(i.symbol()), market.changePct(i.symbol()), market.history(i.symbol()))).toList();
    }

    public List<ModelDto> models() { return MODELS; }

    @Transactional(readOnly = true)
    public PortfolioDto portfolio(String email) {
        User u = users.findByEmail(email).orElseThrow();
        List<HoldingDto> list = new ArrayList<>();
        Map<String, BigDecimal> byCat = new LinkedHashMap<>();
        BigDecimal invested = BigDecimal.ZERO, cost = BigDecimal.ZERO;

        for (Holding h : holdings.findByOwner(u)) {
            var inst = market.find(h.getSymbol()).orElse(null);
            if (inst == null || h.getUnits().signum() <= 0) continue;
            BigDecimal price = market.price(h.getSymbol());
            BigDecimal value = h.getUnits().multiply(price).setScale(2, RoundingMode.HALF_UP);
            BigDecimal pnl = value.subtract(h.getCost());
            BigDecimal avg = h.getCost().divide(h.getUnits(), 2, RoundingMode.HALF_UP);
            list.add(new HoldingDto(h.getSymbol(), inst.name(), inst.category(), h.getUnits(), avg, price, value,
                h.getCost(), pnl, pct(pnl, h.getCost()), market.history(h.getSymbol())));
            invested = invested.add(value);
            cost = cost.add(h.getCost());
            byCat.merge(inst.category(), value, BigDecimal::add);
        }
        list.sort(Comparator.comparing(HoldingDto::value).reversed());
        BigDecimal pnl = invested.subtract(cost);
        BigDecimal cash = u.getBalance();
        List<AllocDto> alloc = byCat.entrySet().stream().map(e -> new AllocDto(e.getKey(), e.getValue())).toList();
        return new PortfolioDto(cash, invested, cost, pnl, pct(pnl, cost), cash.add(invested), list, alloc);
    }

    @Transactional(readOnly = true)
    public List<OrderDto> orders(String email) {
        User u = users.findByEmail(email).orElseThrow();
        return orders.findTop40ByOwnerOrderByCreatedAtDesc(u).stream().map(o -> new OrderDto(
            o.getId(), o.getSide(), o.getSymbol(),
            market.find(o.getSymbol()).map(MarketService.Instrument::name).orElse(o.getSymbol()),
            o.getUnits(), o.getPrice(), o.getAmount(), o.getFee(), o.getPnl(), o.getCreatedAt())).toList();
    }

    // ---------------- trade ----------------

    @Transactional
    public OrderDto buy(String email, TradeRequest r) {
        User u = users.findByEmailForUpdate(email).orElseThrow();
        if (r.amount() == null) throw bad("Amount is required");
        return toDto(doBuy(u, r.symbol(), r.amount()));
    }

    @Transactional
    public OrderDto sell(String email, TradeRequest r) {
        User u = users.findByEmailForUpdate(email).orElseThrow();
        var inst = market.find(r.symbol()).orElseThrow(() -> bad("Unknown instrument"));
        Holding h = holdings.findByOwnerAndSymbol(u, inst.symbol()).orElseThrow(() -> bad("You do not own this instrument"));
        BigDecimal price = market.price(inst.symbol());

        boolean all = Boolean.TRUE.equals(r.all());
        BigDecimal units;
        if (all) units = h.getUnits();
        else {
            if (r.amount() == null) throw bad("Amount is required");
            units = r.amount().divide(price, 6, RoundingMode.DOWN);
            if (units.compareTo(h.getUnits()) > 0) {
                BigDecimal left = h.getUnits().subtract(units).abs().multiply(price);
                if (left.compareTo(new BigDecimal("1.00")) > 0) throw bad("You do not own that much");
                units = h.getUnits();
            }
        }
        if (units.signum() <= 0) throw bad("Amount is too small");

        BigDecimal gross = units.multiply(price).setScale(2, RoundingMode.HALF_UP);
        BigDecimal fee = gross.multiply(FEE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal net = gross.subtract(fee);
        BigDecimal costPart = units.compareTo(h.getUnits()) == 0 ? h.getCost()
            : h.getCost().multiply(units).divide(h.getUnits(), 2, RoundingMode.HALF_UP);

        wallet.credit(u.getId(), net);
        h.remove(units, costPart);
        if (h.getUnits().signum() <= 0) holdings.delete(h); else holdings.save(h);

        return toDto(orders.save(new InvestOrder(u, "SELL", inst.symbol(), units, price, gross, fee, net.subtract(costPart))));
    }

    @Transactional
    public List<OrderDto> applyModel(String email, ApplyModelRequest r) {
        User u = users.findByEmailForUpdate(email).orElseThrow();
        ModelDto m = MODELS.stream().filter(x -> x.id().equals(r.model())).findFirst().orElseThrow(() -> bad("Unknown model"));
        if (r.amount().compareTo(BigDecimal.valueOf(m.minAmount())) < 0) {
            throw bad("Minimum for this portfolio is " + m.minAmount() + " MAD");
        }
        List<OrderDto> out = new ArrayList<>();
        for (ModelPart p : m.parts()) {
            BigDecimal part = r.amount().multiply(BigDecimal.valueOf(p.pct())).divide(BigDecimal.valueOf(100), 2, RoundingMode.DOWN);
            out.add(toDto(doBuy(u, p.symbol(), part)));
        }
        return out;
    }

    private InvestOrder doBuy(User u, String symbol, BigDecimal amount) {
        var inst = market.find(symbol).orElseThrow(() -> bad("Unknown instrument"));
        if (amount.compareTo(MIN) < 0) throw bad("Minimum order is 50 MAD");
        if (amount.compareTo(MAX) > 0) throw bad("Maximum order is 200 000 MAD");

        BigDecimal price = market.price(inst.symbol());
        BigDecimal fee = amount.multiply(FEE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal net = amount.subtract(fee);
        BigDecimal units = net.divide(price, 6, RoundingMode.DOWN);
        if (units.signum() <= 0) throw bad("Amount is too small");

        if (wallet.debit(u.getId(), amount) == 0) throw bad("Insufficient balance");

        Holding h = holdings.findByOwnerAndSymbol(u, inst.symbol()).orElseGet(() -> new Holding(u, inst.symbol()));
        h.add(units, net);
        holdings.save(h);
        return orders.save(new InvestOrder(u, "BUY", inst.symbol(), units, price, amount, fee, null));
    }

    // ---------------- helpers ----------------

    private OrderDto toDto(InvestOrder o) {
        return new OrderDto(o.getId(), o.getSide(), o.getSymbol(),
            market.find(o.getSymbol()).map(MarketService.Instrument::name).orElse(o.getSymbol()),
            o.getUnits(), o.getPrice(), o.getAmount(), o.getFee(), o.getPnl(), o.getCreatedAt());
    }

    private static double pct(BigDecimal part, BigDecimal base) {
        return base.signum() == 0 ? 0 : part.divide(base, 6, RoundingMode.HALF_UP).doubleValue() * 100;
    }

    private static ModelPart part(String symbol, int pct) {
        String name = MarketService.ALL.stream().filter(i -> i.symbol().equals(symbol)).findFirst().orElseThrow().name();
        return new ModelPart(symbol, name, pct);
    }

    private static ModelDto model(String id, String name, String tag, int risk, double ret, List<ModelPart> parts) {
        int min = parts.stream().mapToInt(p -> (int) Math.ceil(5000.0 / p.pct())).max().orElse(50);
        return new ModelDto(id, name, tag, risk, ret, Math.max(min, 50), parts);
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}