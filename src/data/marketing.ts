// src/data/marketing.ts
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Braces,
  Layers3,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";

export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: "Get Started", href: "/signup" },
  { label: "Infrastructure", href: "#infrastructure" },
  { label: "Developers", href: "#developers" },
  { label: "Network", href: "#network" },
  { label: "Security", href: "#security" },
];

export type Stat = { value: string; label: string };

export const STATS: Stat[] = [
  { value: "99.98%", label: "Uptime Protocol" },
  { value: "12,400+", label: "Cloud Nodes" },
  { value: "2.0%", label: "Merchant Fee" },
  { value: "180ms", label: "Latency Log" },
];

export type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  tone: "green" | "blue";
};

export const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: "Instant Liquidation",
    body: "Withdraw funds to Tanzanian mobile wallets in seconds. No holding periods, no delays.",
    tone: "green",
  },
  {
    icon: ShieldCheck,
    title: "E2E Encryption",
    body: "Bank-grade encryption with layered security controls and two-factor authentication.",
    tone: "blue",
  },
  {
    icon: Braces,
    title: "Micro-Service API",
    body: "A developer-first architecture with clean JSON responses and resilient webhook handling.",
    tone: "green",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    body: "High-precision transaction telemetry to understand revenue and payment activity in real time.",
    tone: "blue",
  },
  {
    icon: Smartphone,
    title: "Native Mobile Money",
    body: "Seamless checkout experiences across Tanzania's major mobile-money networks.",
    tone: "green",
  },
  {
    icon: Layers3,
    title: "Scalable Logic",
    body: "Engineered for high-concurrency payment events without compromising application performance.",
    tone: "blue",
  },
];

export const NETWORKS = [
  "M-Pesa",
  "Tigo Pesa",
  "Airtel Money",
  "Halopesa",
  "Bank Payments",
  "Developer API",
];