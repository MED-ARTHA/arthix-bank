import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import AuthBrandHeader from "@/components/AuthBrandHeader";
import "./lights.css";
import "./aurora.css";
import "./palette.css";
import SidebarToggle from "@/components/SidebarToggle";
import HiddenMenuLogo from "@/components/HiddenMenuLogo";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "Arthix Banque",
  description: "Online banking demo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        {children}
        <SidebarToggle />
        <HiddenMenuLogo />
        <AuthBrandHeader />
      </body>
    </html>
  );
}