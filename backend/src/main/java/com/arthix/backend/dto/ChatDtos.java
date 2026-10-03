package com.arthix.backend.dto;

public class ChatDtos {

    public record ChatMessageDto(Long id, String from, String to, String content, String createdAt,
                                 boolean read, String clientId, String mediaUrl, String mediaType) {}

    public record ConversationDto(String account, String name, String avatarUrl, String lastMessage,
                                  String lastAt, boolean lastMine, long unread, boolean online) {}

    public record PeerDto(String account, String name, String avatarUrl, boolean online) {}

    public record SendPayload(String to, String content, String clientId, String mediaId) {}
    public record TypingPayload(String to) {}
    public record ReadPayload(String with) {}

    public record TypingEvent(String from) {}
    public record ReadEvent(String by) {}

    public record PresenceDto(boolean online) {}
    public record UnreadDto(long count) {}
}