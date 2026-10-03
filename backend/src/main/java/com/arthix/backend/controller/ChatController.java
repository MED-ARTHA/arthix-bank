package com.arthix.backend.controller;

import com.arthix.backend.dto.ChatDtos.*;
import com.arthix.backend.service.ChatService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chat;

    public ChatController(ChatService chat) {
        this.chat = chat;
    }

    @GetMapping("/conversations")
    public List<ConversationDto> conversations(Authentication auth) {
        return chat.conversations(auth.getName());
    }

    @GetMapping("/messages")
    public List<ChatMessageDto> messages(Authentication auth, @RequestParam("with") String with) {
        return chat.history(auth.getName(), with);
    }

    @GetMapping("/peer")
    public PeerDto peer(Authentication auth, @RequestParam("account") String account) {
        return chat.peer(auth.getName(), account);
    }

    @GetMapping("/unread")
    public UnreadDto unread(Authentication auth) {
        return new UnreadDto(chat.unreadCount(auth.getName()));
    }

    @GetMapping("/presence")
    public PresenceDto presence(@RequestParam("account") String account) {
        return new PresenceDto(chat.isOnline(account));
    }
}