package com.arthix.backend.controller;

import com.arthix.backend.dto.ChatDtos.*;
import com.arthix.backend.service.ChatService;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;

@Controller
public class ChatSocketController {

    private final ChatService chat;
    private final SimpMessagingTemplate template;

    public ChatSocketController(ChatService chat, SimpMessagingTemplate template) {
        this.chat = chat;
        this.template = template;
    }

    @MessageMapping("/chat.send")
    public void send(@Payload SendPayload p, Principal principal) {
        ChatService.Sent s = chat.send(principal.getName(), p.to(), p.content(), p.clientId(), p.mediaId());
        template.convertAndSendToUser(s.recipientEmail(), "/queue/messages", s.dto());
        template.convertAndSendToUser(s.senderEmail(), "/queue/messages", s.dto());
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingPayload p, Principal principal) {
        ChatService.TypingTarget t = chat.typingTarget(principal.getName(), p.to());
        if (t != null) {
            template.convertAndSendToUser(t.peerEmail(), "/queue/typing", new TypingEvent(t.myAccount()));
        }
    }

    @MessageMapping("/chat.read")
    public void read(@Payload ReadPayload p, Principal principal) {
        ChatService.ReadResult r = chat.markRead(principal.getName(), p.with());
        if (r.count() > 0 && r.peerEmail() != null) {
            template.convertAndSendToUser(r.peerEmail(), "/queue/read", new ReadEvent(r.myAccount()));
        }
    }

    @MessageExceptionHandler
    @SendToUser("/queue/errors")
    public String onError(Exception e) {
        if (e instanceof ResponseStatusException r && r.getReason() != null) return r.getReason();
        return "Something went wrong";
    }
}