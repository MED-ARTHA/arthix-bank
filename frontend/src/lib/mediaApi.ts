import { request } from "@/lib/api";

export const setAvatar = (mediaId: string) =>
  request<{ avatarUrl: string }>("/api/profile/avatar", { method: "PUT", body: JSON.stringify({ mediaId }) });

export const clearAvatar = () => request<void>("/api/profile/avatar", { method: "DELETE" });