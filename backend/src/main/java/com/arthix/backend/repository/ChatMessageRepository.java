package com.arthix.backend.repository;

import com.arthix.backend.entity.ChatMessage;
import com.arthix.backend.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("select m from ChatMessage m where (m.sender = :a and m.recipient = :b) or (m.sender = :b and m.recipient = :a) order by m.createdAt desc, m.id desc")
    List<ChatMessage> findConversation(@Param("a") User a, @Param("b") User b, Pageable pageable);

    @Query("select m from ChatMessage m where m.sender = :u or m.recipient = :u order by m.createdAt desc, m.id desc")
    List<ChatMessage> findRecentFor(@Param("u") User u, Pageable pageable);

    @Query("select count(m) from ChatMessage m where m.recipient = :u and m.readAt is null")
    long countUnread(@Param("u") User u);

    @Query("select m.sender.id, count(m) from ChatMessage m where m.recipient = :u and m.readAt is null group by m.sender.id")
    List<Object[]> unreadBySender(@Param("u") User u);

    @Modifying
    @Query("update ChatMessage m set m.readAt = :now where m.recipient = :me and m.sender = :other and m.readAt is null")
    int markRead(@Param("me") User me, @Param("other") User other, @Param("now") Instant now);
}