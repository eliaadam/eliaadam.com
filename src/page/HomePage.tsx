// src/pages/home.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Braces,
  Check,
  ChevronRight,
  Code2,
  Layers3,
  Menu,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { cn } from "../design-system/lib/utils";
import { Badge } from "../components/ui/badge";

type Node = {
  id: number;
  x: number;
  y: number;
  status?: "green" | "blue";
};

type Edge = [number, number];

type Packet = {
  edge: Edge;
  color: "green" | "blue";
  dur: string;
  begin: string;
};

const NODES: Node[] = [
  { id: 0, x: 60, y: 80 },
  { id: 1, x: 180, y: 40 },
  { id: 2, x: 300, y: 70, status: "green" },
  { id: 3, x: 360, y: 170 },
  { id: 4, x: 270, y: 180 },
  { id: 5, x: 150, y: 150, status: "green" },
  { id: 6, x: 40, y: 200 },
  { id: 7, x: 120, y: 260 },
  { id: 8, x: 250, y: 280, status: "blue" },
  { id: 9, x: 340, y: 300 },
  { id: 10, x: 200, y: 340 },
  { id: 11, x: 70, y: 330 },
];

const EDGES: Edge[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [1, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 9],
  [8, 10],
  [10, 11],
  [7, 11],
  [4, 8],
  [0, 6],
  [2, 4],
];

const PACKETS: Packet[] = [
  { edge: [1, 2], color: "green", dur: "3.4s", begin: "0s" },
  { edge: [4, 5], color: "blue", dur: "4.1s", begin: "0.6s" },
  { edge: [7, 8], color: "green", dur: "3.8s", begin: "1.2s" },
  { edge: [8, 9], color: "blue", dur: "3.1s", begin: "0.2s" },
  { edge: [10, 11], color: "green", dur: "4.6s", begin: "1.8s" },
  { edge: [0, 6], color: "blue", dur: "3.9s", begin: "0.9s" },
];

const NAV_LINKS = [
  { label: "Get Started", href: "#get-started" },
  { label: "Infrastructure", href: "#infrastructure" },
  { label: "Developers", href: "#developers" },
  { label: "Network", href: "#network" },
  { label: "Security", href: "#security" },
];

const STATS = [
  { value: "99.98%", label: "Uptime Protocol" },
  { value: "12,400+", label: "Cloud Nodes" },
  { value: "2.0%", label: "Merchant Fee" },
  { value: "180ms", label: "Latency Log" },
];

const FEATURES = [
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

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setReduced(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function Logo() {
  return (
    <a
      href="#"
      className="group inline-flex items-center gap-2.5"
      aria-label="SonicPesa home"
    >
      <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg bg-brand-gradient text-white shadow-sm">
        <Zap className="size-4 fill-current" strokeWidth={2.5} />
      </span>

      <span className="font-display text-base font-semibold tracking-tight text-foreground">
        SonicPesa
      </span>
    </a>
  );
}

function SettlementGrid() {
  const reduced = useReducedMotion();

  const nodeById = useMemo(() => {
    const map = new Map<number, Node>();

    NODES.forEach((node) => {
      map.set(node.id, node);
    });

    return map;
  }, []);

  return (
    <svg
      viewBox="0 0 400 400"
      className="size-full"
      role="img"
      aria-label="SonicPesa distributed payment network"
    >
      <defs>
        <filter
          id="sonic-node-glow"
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {EDGES.map(([from, to]) => {
        const a = nodeById.get(from)!;
        const b = nodeById.get(to)!;

        return (
          <path
            key={`${from}-${to}`}
            id={`sonic-edge-${from}-${to}`}
            d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="1"
            fill="none"
          />
        );
      })}

      {PACKETS.map((packet, index) => {
        const origin = nodeById.get(packet.edge[0])!;
        const color =
          packet.color === "green"
            ? "var(--color-brand-green-500)"
            : "var(--color-brand-blue-500)";

        if (reduced) {
          return (
            <circle
              key={`packet-${index}`}
              cx={origin.x}
              cy={origin.y}
              r="2.2"
              fill={color}
              opacity="0.85"
            />
          );
        }

        return (
          <circle key={`packet-${index}`} r="2.2" fill={color} opacity="0.9">
            <animateMotion
              dur={packet.dur}
              begin={packet.begin}
              repeatCount="indefinite"
            >
              <mpath href={`#sonic-edge-${packet.edge[0]}-${packet.edge[1]}`} />
            </animateMotion>
          </circle>
        );
      })}

      {NODES.map((node) => {
        const fill =
          node.status === "green"
            ? "var(--color-brand-green-500)"
            : node.status === "blue"
              ? "var(--color-brand-blue-500)"
              : "currentColor";

        return (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={node.status ? 4.4 : 3.2}
            fill={fill}
            opacity={node.status ? 1 : 0.3}
            filter={node.status ? "url(#sonic-node-glow)" : undefined}
            className={
              node.status && !reduced
                ? "motion-safe:animate-[sonic-node-pulse_2.6s_ease-in-out_infinite]"
                : undefined
            }
          />
        );
      })}
    </svg>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col border-l border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <Logo />

          <Button
            variant="ghost"
            size="icon"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <nav className="mt-10 flex flex-col gap-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={onClose}
              className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="mt-auto">
          <Button className="w-full" asChild>
            <a href="https://ui.sonicpesa.com/signup">
              Start Integration
              <ArrowRight />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Home(): React.ReactElement {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="ds-container">
          <div className="flex h-16 items-center justify-between">
            <Logo />

            <nav className="hidden items-center gap-7 md:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:block">
              <Button size="sm" asChild>
                <a href="#get-started">
                  Get Started
                  <ArrowRight />
                </a>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu />
            </Button>
          </div>
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Hero */}
      <section id="get-started" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(0,87,184,0.14),transparent_30%),radial-gradient(circle_at_85%_65%,rgba(46,174,104,0.1),transparent_28%)]" />

        <div className="ds-container relative">
          <div className="grid items-center gap-14 py-20 md:grid-cols-2 md:py-28 lg:gap-20 lg:py-32">
            <div>
              <Badge
                variant="outline"
                className="border-brand-green-500/30 bg-brand-green-500/5 text-brand-green-600 dark:text-brand-green-400"
              >
                <span className="mr-1.5 size-1.5 rounded-full bg-brand-green-500" />
                Payment infrastructure for Africa
              </Badge>

              <h1 className="font-display mt-6 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                The high-speed{" "}
                <span className="bg-brand-gradient bg-clip-text text-transparent">
                  payment
                </span>{" "}
                grid.
              </h1>

              <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Mfumo wa kisasa wa malipo kwa wafanyabiashara Afrika. Unganisha
                biashara yako, pokea malipo na panua huduma zako kwa miundombinu
                iliyojengwa kwa kasi na kiwango.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <a href="/register">
                    Start Integration
                    <ArrowRight />
                  </a>
                </Button>

                <Button variant="outline" size="lg" asChild>
                  <a href="/docs">
                    <Code2 />
                    Documentation
                  </a>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Check className="size-3.5 text-success" />
                  Developer-first API
                </span>

                <span className="flex items-center gap-2">
                  <Check className="size-3.5 text-success" />
                  Mobile money ready
                </span>

                <span className="flex items-center gap-2">
                  <Check className="size-3.5 text-success" />
                  Built for scale
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[520px]">
              <div className="absolute -inset-10 rounded-full bg-brand-blue-500/10 blur-3xl" />

              <Card className="relative overflow-hidden border-brand-blue-500/15 bg-surface/90 shadow-xl">
                <CardContent className="p-0">
                  <div className="aspect-square p-7 sm:p-10">
                    <div className="relative flex size-full items-center justify-center rounded-2xl border border-border bg-background/60 text-foreground">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,87,184,0.09),transparent_55%)]" />

                      <div className="relative size-full max-w-[420px]">
                        <SettlementGrid />
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-lg border border-border bg-surface/90 px-4 py-3 text-xs backdrop-blur">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-brand-green-500" />
                          settled
                        </span>

                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-brand-blue-500" />
                          in-flight
                        </span>

                        <span className="font-mono text-[10px] text-foreground">
                          LIVE
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border-y border-border">
          <div className="ds-container">
            <div className="grid grid-cols-2 md:grid-cols-4">
              {STATS.map((stat, index) => (
                <div
                  key={stat.label}
                  className={cn(
                    "px-4 py-6 sm:px-6",
                    index > 0 && "border-l border-border",
                  )}
                >
                  <div className="font-mono text-xl font-medium tracking-tight sm:text-2xl">
                    {stat.value}
                  </div>

                  <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section id="infrastructure" className="py-24 lg:py-32">
        <div className="ds-container">
          <div className="mb-12 max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green-600 dark:text-brand-green-400">
              Autonomous Systems
            </div>

            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Core infrastructure
            </h2>

            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Everything needed to accept, process, monitor and settle digital
              payments from one infrastructure layer.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card
                  key={feature.title}
                  className="group transition-all duration-normal hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <CardHeader>
                    <div
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl border",
                        feature.tone === "green"
                          ? "border-brand-green-500/20 bg-brand-green-500/10 text-brand-green-600 dark:text-brand-green-400"
                          : "border-brand-blue-500/20 bg-brand-blue-500/10 text-brand-blue-600 dark:text-brand-blue-400",
                      )}
                    >
                      <Icon className="size-5" />
                    </div>

                    <CardTitle className="mt-5 text-base">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {feature.body}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Developer section */}
      <section
        id="developers"
        className="border-y border-border bg-muted/30 py-24 lg:py-32"
      >
        <div className="ds-container">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <Badge variant="secondary">
                <Sparkles />
                Sonic-Shell
              </Badge>

              <h2 className="font-display mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Built for engineers.
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                SonicPesa is more than a payment gateway. It provides the
                building blocks required to integrate payments into modern
                digital products.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <Code2 className="size-5 text-brand-blue-500" />

                    <h3 className="mt-4 text-sm font-semibold">SDK Autonomy</h3>

                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Pre-built modules for common application stacks and
                      payment workflows.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <ShieldCheck className="size-5 text-brand-green-500" />

                    <h3 className="mt-4 text-sm font-semibold">Secure Vault</h3>

                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Structured API credentials and security controls for
                      production integrations.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="overflow-hidden bg-[#0B1014] text-slate-100">
              <div className="flex h-11 items-center border-b border-white/10 px-4">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-white/20" />
                  <span className="size-2.5 rounded-full bg-white/20" />
                  <span className="size-2.5 rounded-full bg-white/20" />
                </div>

                <span className="mx-auto font-mono text-[10px] text-slate-500">
                  sonic-shell — zsh
                </span>

                <span className="w-8" />
              </div>

              <pre className="overflow-x-auto p-6 font-mono text-xs leading-7 sm:text-sm">
                <code>
                  <span className="text-slate-500">$</span>{" "}
                  <span className="text-slate-200">
                    curl -X POST https://api.sonicpesa.com/v1/pay
                  </span>
                  {"\n"}
                  {"  "}
                  <span className="text-slate-500">-H</span>{" "}
                  <span className="text-slate-300">
                    &quot;X-API-KEY: live_vault_99...&quot;
                  </span>
                  {"\n"}
                  {"  "}
                  <span className="text-slate-500">-d</span>{" "}
                  <span className="text-slate-300">{"{"}</span>
                  {"\n"}
                  {"    "}
                  <span className="text-brand-blue-400">&quot;phone&quot;</span>
                  <span className="text-slate-500">:</span>{" "}
                  <span className="text-brand-green-400">
                    &quot;255788123456&quot;
                  </span>
                  <span className="text-slate-500">,</span>
                  {"\n"}
                  {"    "}
                  <span className="text-brand-blue-400">
                    &quot;amount&quot;
                  </span>
                  <span className="text-slate-500">:</span>{" "}
                  <span className="text-slate-200">150000</span>
                  <span className="text-slate-500">,</span>
                  {"\n"}
                  {"    "}
                  <span className="text-brand-blue-400">
                    &quot;currency&quot;
                  </span>
                  <span className="text-slate-500">:</span>{" "}
                  <span className="text-brand-green-400">&quot;TZS&quot;</span>
                  {"\n"}
                  {"  "}
                  <span className="text-slate-300">{"}"}</span>
                  {"\n\n"}
                  <span className="text-brand-green-400">●</span>{" "}
                  <span className="text-slate-500">
                    Protocol status: nominal
                  </span>
                </code>
              </pre>
            </Card>
          </div>
        </div>
      </section>

      {/* Network */}
      <section id="network" className="py-24 lg:py-32">
        <div className="ds-container">
          <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue-600 dark:text-brand-blue-400">
                Payment Network
              </div>

              <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                One connection.
                <br />
                Multiple payment rails.
              </h2>

              <p className="mt-5 text-base leading-7 text-muted-foreground">
                Connect your application once and build payment experiences
                around a consistent infrastructure layer.
              </p>

              <Button className="mt-8" variant="outline" asChild>
                <a href="/docs">
                  Explore the network
                  <ChevronRight />
                </a>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "M-Pesa",
                "Tigo Pesa",
                "Airtel Money",
                "Halopesa",
                "Bank Payments",
                "Developer API",
              ].map((network) => (
                <Card key={network}>
                  <CardContent className="flex items-center gap-3 p-5">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                      <Check className="size-4 text-success" />
                    </span>

                    <span className="text-sm font-medium">{network}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section
        id="security"
        className="relative overflow-hidden border-y border-border py-24 lg:py-32"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(46,174,104,0.08),transparent_42%)]" />

        <div className="ds-container relative">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline">
              <ShieldCheck />
              Security-first infrastructure
            </Badge>

            <h2 className="font-display mt-6 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Designed to protect every transaction.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Security controls are integrated throughout the payment lifecycle,
              from credentials and APIs to transaction processing and
              settlement.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Badge variant="success">Encrypted</Badge>
              <Badge variant="info">Monitored</Badge>
              <Badge variant="secondary">Auditable</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,87,184,0.12),transparent_45%)]" />

        <div className="ds-container relative">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Ready to{" "}
              <span className="bg-brand-gradient bg-clip-text text-transparent">
                evolve
              </span>
              ?
            </h2>

            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Jiunge na mfumo wa malipo wenye kasi na miundombinu iliyojengwa
              kwa biashara zinazotaka kukua.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <a href="/register">
                  Initialize Merchant ID
                  <ArrowRight />
                </a>
              </Button>

              <Button variant="outline" size="lg" asChild>
                <a href="/docs">Read the documentation</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border py-20 lg:py-24">
        <div className="ds-container">
          <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Frequently Asked
              </div>

              <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight">
                Common questions
              </h2>
            </div>

            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger>What is SonicPesa?</AccordionTrigger>
                <AccordionContent>
                  SonicPesa is a payment infrastructure platform designed to
                  help businesses integrate digital payments into their products
                  and services.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>
                  Who can integrate SonicPesa?
                </AccordionTrigger>
                <AccordionContent>
                  Businesses and developers can use the platform to build
                  payment flows into websites, applications and other digital
                  products.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>
                  Does SonicPesa support mobile money?
                </AccordionTrigger>
                <AccordionContent>
                  The homepage presents support for major Tanzanian mobile money
                  payment networks through the SonicPesa infrastructure.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>
                  Where can developers find the API documentation?
                </AccordionTrigger>
                <AccordionContent>
                  Developer documentation can be accessed through the
                  Documentation entry in the navigation and calls to action.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="ds-container">
          <div className="grid gap-12 py-14 md:grid-cols-4">
            <div className="md:col-span-2">
              <Logo />

              <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
                Engineered for payment performance. Built for modern African
                commerce.
              </p>

              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-success" />
                Systems operational
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">
                Platform
              </h3>

              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>
                  <a className="hover:text-foreground" href="#infrastructure">
                    Infrastructure
                  </a>
                </li>
                <li>
                  <a className="hover:text-foreground" href="#developers">
                    Developers
                  </a>
                </li>
                <li>
                  <a className="hover:text-foreground" href="#network">
                    Network
                  </a>
                </li>
                <li>
                  <a className="hover:text-foreground" href="#security">
                    Security
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">
                Resources
              </h3>

              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>
                  <a className="hover:text-foreground" href="/docs">
                    Documentation
                  </a>
                </li>
                <li>
                  <a className="hover:text-foreground" href="/dashboard">
                    Control Panel
                  </a>
                </li>
                <li>
                  <a className="hover:text-foreground" href="/terms">
                    Terms
                  </a>
                </li>
                <li>
                  <a className="hover:text-foreground" href="/privacy">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 SonicPesa Infrastructure.</span>

            <span className="font-mono">
              DISTRIBUTED_FINANCIAL_OPERATING_SYSTEM
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
