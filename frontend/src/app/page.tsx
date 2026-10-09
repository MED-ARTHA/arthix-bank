import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "Arthix | Digital banking, made for Morocco (demo)",
  description: "Send, pay, save and invest in dirhams from one calm place. A demo banking app: no real funds are moved.",
};

export default function Home() {
  return <Landing />;
}