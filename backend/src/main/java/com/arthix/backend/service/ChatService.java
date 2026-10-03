package com.arthix.backend.service;

import com.arthix.backend.dto.ChatDtos.*;
import com.arthix.backend.entity.ChatMessage;
import com.arthix.backend.entity.MediaFile;
import com.arthix.backend.entity.User;
import com.arthix.backend.repository.ChatMessageRepository;
import com.arthix.backend.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChatService {

    private static final int MAX_LEN = 1000;

    public record Sent(ChatMessageDto dto, String senderEmail, String recipientEmail) {}
    public record TypingTarget(String peerEmail, String myAccount) {}
    public record ReadResult(String peerEmail, String myAccount, int count) {}

    private final UserRepository users;
    private final ChatMessageRepository messages;
    private final SimpUserRegistry registry;
    private final MediaService media;

    public ChatService(UserRepository users, ChatMessageRepository messages,
                       SimpUserRegistry registry, MediaService media) {
        this.users = users;
        this.messages = messages;
        this.registry = registry;
        this.media = media;
    }

    @Transactional
    public Sent send(String email, String toAccount, String content, String clientId, String mediaId) {
        User me = users.findByEmail(email).orElseThrow();
        String text = content == null ? "" : content.strip();
        if (text.length() > MAX_LEN) throw bad("Message is too long (1000 characters max)");

        String url = null;
        String type = null;
        if (mediaId != null && !mediaId.isBlank()) {
            MediaFile f = media.requireOwned(me, mediaId.trim());
            url = MediaService.urlOf(f);
            type = f.getKind();
        }
        if (text.isEmpty() && url == null) throw bad("Message is empty");

        User other = users.findByAccountNumber(normalize(toAccount))
            .orElseThrow(() -> bad("Recipient not found"));
        if (other.getId().equals(me.getId())) throw bad("You cannot message yourself");

        ChatMessage m = messages.save(new ChatMessage(me, other, text, url, type));
        return new Sent(toDto(m, clientId), me.getEmail(), other.getEmail());
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> history(String email, String withAccount) {
        User me = users.findByEmail(email).orElseThrow();
        User other = users.findByAccountNumber(normalize(withAccount))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        List<ChatMessage> list = new ArrayList<>(messages.findConversation(me, other, PageRequest.of(0, 100)));
        Collections.reverse(list);
        return list.stream().map(m -> toDto(m, null)).toList();
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> conversations(String email) {
        User me = users.findByEmail(email).orElseThrow();

        Map<Long, Long> unread = new HashMap<>();
        for (Object[] row : messages.unreadBySender(me)) {
            unread.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }

        Map<Long, ChatMessage> latest = new LinkedHashMap<>();
        for (ChatMessage m : messages.findRecentFor(me, PageRequest.of(0, 400))) {
            boolean mine = m.getSender().getId().equals(me.getId());
            User peer = mine ? m.getRecipient() : m.getSender();
            latest.putIfAbsent(peer.getId(), m);
        }

        List<ConversationDto> out = new ArrayList<>();
        for (ChatMessage m : latest.values()) {
            boolean mine = m.getSender().getId().equals(me.getId());
            User peer = mine ? m.getRecipient() : m.getSender();
            out.add(new ConversationDto(
                peer.getAccountNumber(), mask(peer.getFullName()), peer.getAvatarUrl(), preview(m),
                m.getCreatedAt().toString(), mine, unread.getOrDefault(peer.getId(), 0L),
                registry.getUser(peer.getEmail()) != null));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public PeerDto peer(String email, String account) {
        User me = users.findByEmail(email).orElseThrow();
        User other = users.findByAccountNumber(normalize(account))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (other.getId().equals(me.getId())) throw bad("This is your own account");
        return new PeerDto(other.getAccountNumber(), mask(other.getFullName()), other.getAvatarUrl(),
            registry.getUser(other.getEmail()) != null);
    }

    @Transactional(readOnly = true)
    public long unreadCount(String email) {
        return messages.countUnread(users.findByEmail(email).orElseThrow());
    }

    @Transactional(readOnly = true)
    public boolean isOnline(String account) {
        return users.findByAccountNumber(normalize(account))
            .map(u -> registry.getUser(u.getEmail()) != null)
            .orElse(false);
    }

    @Transactional
    public ReadResult markRead(String email, String withAccount) {
        User me = users.findByEmail(email).orElseThrow();
        User other = users.findByAccountNumber(normalize(withAccount)).orElse(null);
        if (other == null) return new ReadResult(null, me.getAccountNumber(), 0);
        int n = messages.markRead(me, other, Instant.now());
        return new ReadResult(other.getEmail(), me.getAccountNumber(), n);
    }

    @Transactional(readOnly = true)
    public TypingTarget typingTarget(String email, String toAccount) {
        User me = users.findByEmail(email).orElseThrow();
        return users.findByAccountNumber(normalize(toAccount))
            .filter(u -> !u.getId().equals(me.getId()))
            .map(u -> new TypingTarget(u.getEmail(), me.getAccountNumber()))
            .orElse(null);
    }

    private static String preview(ChatMessage m) {
        if (m.getContent() != null && !m.getContent().isBlank()) return m.getContent();
        return "video".equals(m.getMediaType()) ? "Video" : "Photo";
    }

    private static ChatMessageDto toDto(ChatMessage m, String clientId) {
        return new ChatMessageDto(m.getId(), m.getSender().getAccountNumber(), m.getRecipient().getAccountNumber(),
            m.getContent(), m.getCreatedAt().toString(), m.getReadAt() != null, clientId,
            m.getMediaUrl(), m.getMediaType());
    }

    private static String normalize(String s) {
        return s == null ? "" : s.replaceAll("\\s+", "").toUpperCase();
    }

    private static String mask(String full) {
        String[] p = full.trim().split("\\s+");
        if (p.length == 1) return p[0];
        return p[0] + " " + p[p.length - 1].charAt(0) + ".";
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}