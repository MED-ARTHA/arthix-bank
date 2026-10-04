package com.arthix.backend.service;

import com.arthix.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Answers questions about Arthix. Calls the Claude API from the server so the key never reaches the browser. */
@Service
public class AssistantService {

    public record Msg(String role, String content) {}

    private static final Logger log = LoggerFactory.getLogger(AssistantService.class);
    private static final String URL = "https://api.anthropic.com/v1/messages";
    private static final int MAX_PER_MINUTE = 15;

    private static final String SYSTEM = """
        You are Arthix Assistant, the help assistant inside the Arthix demo banking app.
        Answer questions about the app and general money basics, briefly and clearly (max 6 short sentences).
        Reply in the language the user writes in (Darija in Latin letters, French, English...).

        The app has: Overview (balance and activity); Transfers (instant, to an ARX account number);
        Scheduled transfers (one time, weekly or monthly); Payments (bills, telecom, schools, insurance, taxes, transport,
        with a printable receipt); Add money (card deposit 10-20000 MAD, or vouchers 50-10000 MAD); Savings goals;
        Transactions; Messages (real-time chat with photos and videos between accounts); Offers & tools (loan, savings and
        currency simulators); Profile & security (photo, name, password); Invest (simulated market with 10 instruments,
        news events that move prices, portfolio, buy/sell from 50 MAD with a 0.2% fee, and a Smart portfolio built from a
        4-question risk profile: Prudent, Balanced or Dynamic).

        Rules: this is a demo with fake money and generated prices. You cannot perform actions, see passwords or card
        numbers, and you must never ask for them. Never give personal financial, legal or tax advice: explain concepts and
        suggest the simulators. If asked something unrelated to Arthix or personal finance, politely say you can only help
        with Arthix. Use the context below when relevant and never invent features.
        """;

    private final RestClient http = RestClient.create();
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final UserRepository users;
    private final MarketService market;
    private final String key;
    private final String model;

    public AssistantService(UserRepository users, MarketService market,
                            @Value("${app.ai.key:}") String key,
                            @Value("${app.ai.model:claude-haiku-4-5-20251001}") String model) {
        this.users = users;
        this.market = market;
        this.key = key == null ? "" : key.trim();
        this.model = model;
    }

    public String reply(String email, List<Msg> raw) {
        throttle(email);
        List<Map<String, String>> msgs = clean(raw);
        if (msgs.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty message");
        String last = msgs.get(msgs.size() - 1).get("content");
        if (key.isBlank()) return offline(last);

        Map<String, Object> body = Map.of(
            "model", model,
            "max_tokens", 600,
            "system", SYSTEM + "\n" + context(email),
            "messages", msgs);
        try {
            Map<?, ?> res = http.post().uri(URL)
                .header("x-api-key", key)
                .header("anthropic-version", "2023-06-01")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);
            StringBuilder out = new StringBuilder();
            if (res != null && res.get("content") instanceof List<?> parts) {
                for (Object o : parts) {
                    if (o instanceof Map<?, ?> m && "text".equals(m.get("type"))) out.append(m.get("text"));
                }
            }
            return out.isEmpty() ? "I could not answer that, please try again." : out.toString().trim();
        } catch (RestClientException e) {
            log.error("Assistant call failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The assistant is unavailable right now");
        }
    }

    private String context(String email) {
        StringBuilder sb = new StringBuilder("Context:\n");
        users.findByEmail(email).ifPresent(u -> sb.append("- User first name: ")
            .append(u.getFullName().trim().split("\\s+")[0]).append("\n- Balance: ").append(u.getBalance()).append(" MAD\n"));
        market.events().stream().limit(3).forEach(e -> sb.append("- Market news: ").append(e.headline()).append("\n"));
        return sb.toString();
    }

    /** Keeps the last 8 turns, caps their length, and makes sure the conversation starts and ends with the user. */
    private static List<Map<String, String>> clean(List<Msg> raw) {
        List<Map<String, String>> out = new ArrayList<>();
        if (raw == null) return out;
        int from = Math.max(0, raw.size() - 8);
        for (Msg m : raw.subList(from, raw.size())) {
            if (m == null || m.content() == null || m.content().isBlank()) continue;
            String role = "assistant".equals(m.role()) ? "assistant" : "user";
            String text = m.content().strip();
            out.add(Map.of("role", role, "content", text.length() > 600 ? text.substring(0, 600) : text));
        }
        while (!out.isEmpty() && !"user".equals(out.get(0).get("role"))) out.remove(0);
        while (!out.isEmpty() && !"user".equals(out.get(out.size() - 1).get("role"))) out.remove(out.size() - 1);
        return out;
    }

    private void throttle(String email) {
        Deque<Long> q = hits.computeIfAbsent(email, k -> new ArrayDeque<>());
        long now = System.currentTimeMillis();
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > 60_000) q.pollFirst();
            if (q.size() >= MAX_PER_MINUTE) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many questions, wait a moment");
            }
            q.addLast(now);
        }
    }

    /** Basic answers when no API key is configured. */
    private static String offline(String q) {
        String s = q.toLowerCase();
        if (s.contains("invest") || s.contains("market") || s.contains("portfolio"))
            return "In Invest you can buy simulated instruments from 50 MAD (0.2% fee), follow market events, or let the Smart portfolio build one from a 4-question profile.";
        if (s.contains("transfer") || s.contains("virement"))
            return "Transfers are instant: enter the recipient's ARX account number and an amount. You can also schedule them weekly or monthly in Scheduled.";
        if (s.contains("pay") || s.contains("bill") || s.contains("facture"))
            return "Payments lets you pay bills, telecom, schools, insurance, taxes and transport. A printable receipt is issued after each payment.";
        if (s.contains("deposit") || s.contains("add money") || s.contains("voucher"))
            return "Add money supports a card deposit (10 to 20 000 MAD) or vouchers (50 to 10 000 MAD).";
        return "I can help with transfers, payments, savings goals, messages, offers and Invest. The AI assistant is in basic mode until an API key is configured.";
    }
}