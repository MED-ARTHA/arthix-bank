"use client";

import { Client } from "@stomp/stompjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { chatApi, type ChatMessage } from "@/lib/chatApi";

export type ChatStatus = "connecting" | "online" | "offline";

export type ChatHandlers = {
  message?: (m: ChatMessage) => void;
  typing?: (fromAccount: string) => void;
  read?: (byAccount: string) => void;
  error?: (text: string) => void;
};

type ChatContextValue = {
  status: ChatStatus;
  unread: number;
  refreshUnread: () => void;
  send: (to: string, content: string, clientId: string, mediaId?: string) => boolean;
  sendTyping: (to: string) => void;
  markRead: (withAccount: string) => void;
  subscribe: (h: ChatHandlers) => () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}

function wsUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
  return base.replace(/^http/, "ws") + "/ws";
}

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ChatStatus>("connecting");
  const [unread, setUnread] = useState(0);
  const clientRef = useRef<Client | null>(null);
  const handlers = useRef(new Set<ChatHandlers>());

  const refreshUnread = useCallback(() => {
    chatApi.unread().then((r) => setUnread(r.count)).catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
    });

    client.onConnect = () => {
      setStatus("online");
      client.subscribe("/user/queue/messages", (f) => {
        const m = JSON.parse(f.body) as ChatMessage;
        handlers.current.forEach((h) => h.message?.(m));
        refreshUnread();
      });
      client.subscribe("/user/queue/typing", (f) => {
        const { from } = JSON.parse(f.body) as { from: string };
        handlers.current.forEach((h) => h.typing?.(from));
      });
      client.subscribe("/user/queue/read", (f) => {
        const { by } = JSON.parse(f.body) as { by: string };
        handlers.current.forEach((h) => h.read?.(by));
      });
      client.subscribe("/user/queue/errors", (f) => {
        handlers.current.forEach((h) => h.error?.(f.body));
      });
      refreshUnread();
    };
    client.onWebSocketClose = () => setStatus(client.active ? "connecting" : "offline");
    client.onStompError = (frame) => {
      const msg = frame.headers["message"] ?? "Connection error";
      handlers.current.forEach((h) => h.error?.(msg));
      if (msg.includes("Unauthorized")) {
        setStatus("offline");
        client.deactivate();
      }
    };

    clientRef.current = client;
    client.activate();
    return () => {
      clientRef.current = null;
      client.deactivate();
    };
  }, [refreshUnread]);

  const send = useCallback((to: string, content: string, clientId: string, mediaId?: string) => {
    const c = clientRef.current;
    if (!c || !c.connected) return false;
    c.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({ to, content, clientId, mediaId: mediaId ?? null }),
    });
    return true;
  }, []);

  const sendTyping = useCallback((to: string) => {
    const c = clientRef.current;
    if (c && c.connected) c.publish({ destination: "/app/chat.typing", body: JSON.stringify({ to }) });
  }, []);

  const markRead = useCallback(
    (withAccount: string) => {
      const c = clientRef.current;
      if (c && c.connected) {
        c.publish({ destination: "/app/chat.read", body: JSON.stringify({ with: withAccount }) });
        setTimeout(refreshUnread, 300);
      }
    },
    [refreshUnread]
  );

  const subscribe = useCallback((h: ChatHandlers) => {
    handlers.current.add(h);
    return () => {
      handlers.current.delete(h);
    };
  }, []);

  const value = useMemo(
    () => ({ status, unread, refreshUnread, send, sendTyping, markRead, subscribe }),
    [status, unread, refreshUnread, send, sendTyping, markRead, subscribe]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}