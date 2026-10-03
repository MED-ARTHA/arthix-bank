import { request } from "@/lib/api";

export type ChatMessage = {
  id: number;
  from: string;
  to: string;
  content: string;
  createdAt: string;
  read: boolean;
  clientId: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
};

export type Conversation = {
  account: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastAt: string;
  lastMine: boolean;
  unread: number;
  online: boolean;
};

export type PeerInfo = { account: string; name: string; avatarUrl: string | null; online: boolean };

export const chatApi = {
  conversations: () => request<Conversation[]>("/api/chat/conversations"),
  messages: (withAccount: string) =>
    request<ChatMessage[]>(`/api/chat/messages?with=${encodeURIComponent(withAccount)}`),
  peer: (account: string) => request<PeerInfo>(`/api/chat/peer?account=${encodeURIComponent(account)}`),
  unread: () => request<{ count: number }>("/api/chat/unread"),
  presence: (account: string) =>
    request<{ online: boolean }>(`/api/chat/presence?account=${encodeURIComponent(account)}`),
};