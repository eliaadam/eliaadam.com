import React, { useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Shared design tokens (kept as constants so every color pull is intentional)
// ---------------------------------------------------------------------------
const INK = "#0A0D10"; // page background — cool near-black
const SURFACE = "#10151A"; // raised panels
const SURFACE_2 = "#161C22"; // cards
const LINE = "#1F262C"; // hairline borders
const TEXT = "#E7ECEF"; // primary text
const TEXT_DIM = "#7C8790"; // secondary text
const SIGNAL_GREEN = "#2FD68C"; // "online / settled" status only
const SIGNAL_BLUE = "#4C8DFF"; // "data / in-flight" status only

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);

    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

// ---------------------------------------------------------------------------
// Signature element: the settlement grid — a node network standing in for
// "the payment grid" itself. Static nodes are the merchant/bank endpoints;
// traveling packets are transactions clearing across the network.
// ---------------------------------------------------------------------------
type Node = { id: number; x: number; y: number; status?: "green" | "blue" };
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

function edgeId(e: Edge): string {
  return `edge-${e[0]}-${e[1]}`;
}

const SettlementGrid: React.FC = () => {
  const reduced = useReducedMotion();
  const nodeById = useMemo(() => {
    const m = new Map<number, Node>();
    NODES.forEach((n) => m.set(n.id, n));

    return m;
  }, []);

  return (
    <svg
      viewBox="0 0 400 400"
      className="h-full w-full"
      role="img"
      aria-label="Animated diagram of SonicPesa's distributed settlement network"
    >
      <defs>
        <filter id="node-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* edges */}
      {EDGES.map((e) => {
        const a = nodeById.get(e[0])!;
        const b = nodeById.get(e[1])!;

        return (
          <path
            key={edgeId(e)}
            id={edgeId(e)}
            d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
            stroke={LINE}
            strokeWidth={1}
            fill="none"
          />
        );
      })}

      {/* packets traveling along edges */}
      {PACKETS.map((p, i) => {
        const color = p.color === "green" ? SIGNAL_GREEN : SIGNAL_BLUE;
        const a = nodeById.get(p.edge[0])!;

        if (reduced) {
          return (
            <circle
              key={`pk-${i}`}
              cx={a.x}
              cy={a.y}
              r={2.2}
              fill={color}
              opacity={0.85}
            />
          );
        }

        return (
          <circle key={`pk-${i}`} r={2.2} fill={color} opacity={0.9}>
            <animateMotion dur={p.dur} begin={p.begin} repeatCount="indefinite">
              <mpath href={`#${edgeId(p.edge)}`} />
            </animateMotion>
          </circle>
        );
      })}

      {/* nodes */}
      {NODES.map((n) => {
        const color =
          n.status === "green"
            ? SIGNAL_GREEN
            : n.status === "blue"
              ? SIGNAL_BLUE
              : "#3A4550";
        const r = n.status ? 4.4 : 3.2;

        return (
          <circle
            key={n.id}
            cx={n.x}
            cy={n.y}
            r={r}
            fill={color}
            filter={n.status ? "url(#node-glow)" : undefined}
            className={
              n.status && !reduced
                ? "motion-safe:animate-[nodePulse_2.6s_ease-in-out_infinite]"
                : ""
            }
          />
        );
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Small inline icon set — kept as line-art glyphs, no external icon library
// ---------------------------------------------------------------------------
const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
};

const IconBolt = () => (
  <svg {...iconProps}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" />
  </svg>
);
const IconShield = () => (
  <svg {...iconProps}>
    <path
      d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"
      strokeLinejoin="round"
    />
    <path d="M9.5 12l1.8 1.8L14.8 10" />
  </svg>
);
const IconBrackets = () => (
  <svg {...iconProps}>
    <path
      d="M9 4 3 12l6 8M15 4l6 8-6 8"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);
const IconBars = () => (
  <svg {...iconProps}>
    <path d="M4 20V10M11 20V4M18 20v-7" strokeLinecap="round" />
  </svg>
);
const IconWave = () => (
  <svg {...iconProps}>
    <rect x="7" y="3" width="10" height="18" rx="2" />
    <path d="M4 12c1-2 2-2 3 0s2 2 3 0M15 12c1-2 2-2 3 0s2 2 3 0" />
  </svg>
);
const IconLayers = () => (
  <svg {...iconProps}>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" strokeLinejoin="round" />
    <path d="M3 13l9 5 9-5M3 18l9 5 9-5" />
  </svg>
);

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------
const NAV_LINKS = [
  { label: "Get Started", href: "/home" },
  { label: "Infrastructure", href: "https://sonicpesa.com/#infrastructure" },
  { label: "Developers", href: "https://sonicpesa.com/#developers" },
  { label: "Network", href: "https://sonicpesa.com/#network" },
  { label: "Security", href: "https://sonicpesa.com/#security" },
];

const STATS = [
  { value: "99.98%", label: "Uptime Protocol" },
  { value: "12,400+", label: "Cloud Nodes" },
  { value: "2.0%", label: "Merchant Fee" },
  { value: "180ms", label: "Latency Log" },
];

const FEATURES: { icon: React.FC; title: string; body: string }[] = [
  {
    icon: IconBolt,
    title: "Instant Liquidation",
    body: "Withdraw funds to Tanzanian mobile wallets in seconds. No holding periods, no delays.",
  },
  {
    icon: IconShield,
    title: "E2E Encryption",
    body: "Bank-grade SHA-256 encryption. Protected by dual-layer firewall protocols and 2FA.",
  },
  {
    icon: IconBrackets,
    title: "Micro-Service API",
    body: "A developer-first architecture. Clean JSON responses and autonomic webhook retry logic.",
  },
  {
    icon: IconBars,
    title: "Deep Analytics",
    body: "High-precision telemetry for every transaction. Understand your revenue growth in real-time.",
  },
  {
    icon: IconWave,
    title: "Native Push USSD",
    body: "Seamless checkout experiences for M-Pesa, Tigo Pesa, Halopesa & Airtel Money.",
  },
  {
    icon: IconLayers,
    title: "Scalable Logic",
    body: "Engineered to handle high-concurrency event streams without performance degradation.",
  },
];

const FOOTER_COLUMNS: {
  heading: string;
  links: { label: string; href: string }[];
}[] = [
  {
    heading: "System Architecture",
    links: [
      { label: "Technical Registry", href: "https://sonicpesa.com/docs" },
      { label: "Security Tokens", href: "https://sonicpesa.com/api" },
      { label: "Control Panel", href: "https://sonicpesa.com/dashboard" },
    ],
  },
  {
    heading: "Operation Policies",
    links: [
      { label: "System Terms", href: "https://sonicpesa.com/terms" },
      { label: "Privacy Vault", href: "https://sonicpesa.com/privacy" },
      { label: "Corporate Bio", href: "https://sonicpesa.com/about" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Home(): React.ReactElement {
  return (
    <div
      className="min-h-screen w-full antialiased"
      style={{
        background: INK,
        color: TEXT,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        .font-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        @keyframes nodePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes caretBlink {
          0%, 45% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .caret { animation: caretBlink 1.1s steps(1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .caret { animation: none; opacity: 1; }
        }
      `}</style>

      {/* ------------------------------------------------------------------ */}
      {/* Nav                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur"
        style={{ borderColor: LINE, background: "rgba(10,13,16,0.75)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a
            href="#"
            className="font-display flex items-center gap-2 text-[15px] font-semibold tracking-tight"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-[6px] border font-mono text-[11px]"
              style={{ borderColor: LINE, color: SIGNAL_BLUE }}
            >
              S
            </span>
            SonicPesa
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="rounded-sm font-mono text-[11px] tracking-[0.14em] uppercase transition-colors hover:text-white focus-visible:ring-1 focus-visible:outline-none"
                style={{ color: TEXT_DIM }}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <a
            href="https://sonicpesa.com/login"
            className="rounded-md border px-4 py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors hover:border-[color:var(--acc)] focus-visible:ring-1 focus-visible:outline-none"
            style={{ borderColor: LINE, color: TEXT }}
          >
            Access Portal
          </a>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.14em] uppercase"
              style={{ borderColor: LINE, color: TEXT_DIM }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: SIGNAL_GREEN }}
              />
              ISO-27001 Protocol Standards Certified
            </div>

            <h1 className="font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight md:text-[3.4rem]">
              The High-Speed
              <br />
              <span style={{ color: SIGNAL_BLUE }}>Payment</span> Grid
            </h1>

            <p
              className="mt-6 max-w-md text-[15px] leading-relaxed"
              style={{ color: TEXT_DIM }}
            >
              System ya kisasa ya malipo kwa wafanyabiashara Afrika. Deploy in
              minutes, scale to millions. Makato madogo sana kwa kila muamala.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="https://sonicpesa.com/register"
                className="rounded-md px-5 py-3 font-mono text-[12px] tracking-[0.1em] uppercase transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
                style={{ background: TEXT, color: INK }}
              >
                Start Integration
              </a>
              <a
                href="https://sonicpesa.com/docs"
                className="font-mono text-[12px] tracking-[0.1em] uppercase underline decoration-dotted underline-offset-4"
                style={{ color: TEXT_DIM }}
              >
                Documentation
              </a>
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[420px]">
            <div
              className="absolute inset-0 rounded-2xl border"
              style={{ borderColor: LINE, background: SURFACE }}
            />
            <div className="absolute inset-6">
              <SettlementGrid />
            </div>
            <div
              className="absolute right-4 bottom-4 left-4 flex items-center justify-between rounded-md border px-3 py-2 font-mono text-[10px]"
              style={{
                borderColor: LINE,
                background: "rgba(16,21,26,0.8)",
                color: TEXT_DIM,
              }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: SIGNAL_GREEN }}
                />
                settled
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: SIGNAL_BLUE }}
                />
                in-flight
              </span>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-y" style={{ borderColor: LINE }}>
          <div
            className="mx-auto grid max-w-6xl grid-cols-2 divide-x md:grid-cols-4"
            style={{ borderColor: LINE }}
          >
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`px-6 py-6 ${i > 0 ? "border-l" : ""}`}
                style={{ borderColor: LINE }}
              >
                <div
                  className="font-mono text-2xl font-medium"
                  style={{ color: TEXT }}
                >
                  {s.value}
                </div>
                <div
                  className="mt-1 font-mono text-[11px] tracking-[0.1em] uppercase"
                  style={{ color: TEXT_DIM }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Core Infrastructure                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-6 py-24" id="infrastructure">
        <div className="mb-14 max-w-xl">
          <span
            className="font-mono text-[11px] tracking-[0.14em] uppercase"
            style={{ color: SIGNAL_GREEN }}
          >
            Autonomous Systems
          </span>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Core Infrastructure
          </h2>
        </div>

        <div
          className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-3"
          style={{ borderColor: LINE, background: LINE }}
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const accent = i % 2 === 0 ? SIGNAL_GREEN : SIGNAL_BLUE;

            return (
              <div
                key={f.title}
                className="group p-7 transition-colors"
                style={{ background: SURFACE_2 }}
              >
                <div
                  className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border transition-colors"
                  style={{
                    borderColor: LINE,
                    color: TEXT_DIM,
                  }}
                >
                  <span
                    className="h-5 w-5 transition-colors group-hover:[color:var(--a)]"
                    style={{
                      ["--a" as string]: accent,
                      color: "inherit",
                    }}
                  >
                    <Icon />
                  </span>
                </div>
                <h3 className="font-display text-[15px] font-semibold">
                  {f.title}
                </h3>
                <p
                  className="mt-2 text-[13.5px] leading-relaxed"
                  style={{ color: TEXT_DIM }}
                >
                  {f.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Built for Engineers                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="border-y"
        style={{ borderColor: LINE }}
        id="developers"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-6 py-24 md:grid-cols-2">
          <div>
            <span
              className="font-mono text-[11px] tracking-[0.14em] uppercase"
              style={{ color: SIGNAL_BLUE }}
            >
              Sonic-Shell v1.0.4
            </span>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Built for
              <br />
              Engineers
            </h2>
            <p
              className="mt-5 max-w-md text-[15px] leading-relaxed"
              style={{ color: TEXT_DIM }}
            >
              SonicPesa isn&rsquo;t just a gateway; it&rsquo;s a complete
              toolkit for building the future of Tanzanian Fintech.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div
                className="rounded-lg border p-4"
                style={{ borderColor: LINE }}
              >
                <div
                  className="font-mono text-[12px] font-medium"
                  style={{ color: TEXT }}
                >
                  SDK Autonomy
                </div>
                <div className="mt-1 text-[12.5px]" style={{ color: TEXT_DIM }}>
                  Pre-built modules for PHP, Go, and React.
                </div>
              </div>
              <div
                className="rounded-lg border p-4"
                style={{ borderColor: LINE }}
              >
                <div
                  className="font-mono text-[12px] font-medium"
                  style={{ color: TEXT }}
                >
                  Secure Vault
                </div>
                <div className="mt-1 text-[12.5px]" style={{ color: TEXT_DIM }}>
                  Encrypted API key management systems.
                </div>
              </div>
            </div>
          </div>

          <div>
            <div
              className="overflow-hidden rounded-xl border"
              style={{ borderColor: LINE, background: "#0D1114" }}
            >
              <div
                className="flex items-center justify-between border-b px-4 py-2.5"
                style={{ borderColor: LINE }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: "#3A4550" }}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: "#3A4550" }}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: "#3A4550" }}
                  />
                </div>
                <span
                  className="font-mono text-[10.5px]"
                  style={{ color: TEXT_DIM }}
                >
                  sonic-shell — zsh
                </span>
                <span />
              </div>
              <pre
                className="overflow-x-auto px-5 py-6 font-mono text-[12.5px] leading-relaxed"
                style={{ color: TEXT }}
              >
                {`$ curl -X POST https://api.sonicpesa.com/v1/pay
  -H "X-API-KEY: live_vault_99..."
  -d {
    "phone": "255788123456",
    "amount": 150000,
    "currency": "TZS"
  }
`}
                <span className="caret" style={{ color: SIGNAL_BLUE }}>
                  _
                </span>
              </pre>
              <div
                className="flex items-center gap-2 border-t px-5 py-3 font-mono text-[11px]"
                style={{ borderColor: LINE, color: TEXT_DIM }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: SIGNAL_GREEN }}
                />
                Protocol status: nominal
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA                                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden px-6 py-28 text-center"
        id="security"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(${LINE} 1px, transparent 1px)`,
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Ready to
            <br />
            <span style={{ color: SIGNAL_GREEN }}>Evolve?</span>
          </h2>
          <p
            className="mt-5 text-[15px] leading-relaxed"
            style={{ color: TEXT_DIM }}
          >
            Jiunge na mfumo wa malipo wenye kasi zaidi. SonicPesa is powering
            the future.
          </p>
          <a
            href="https://sonicpesa.com/register"
            className="mt-8 inline-block rounded-md px-6 py-3 font-mono text-[12px] tracking-[0.1em] uppercase transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
            style={{ background: TEXT, color: INK }}
          >
            Initialize Merchant ID
          </a>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                              */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t" style={{ borderColor: LINE }}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="font-display flex items-center gap-2 text-[15px] font-semibold">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-[6px] border font-mono text-[11px]"
                style={{
                  borderColor: LINE,
                  color: SIGNAL_BLUE,
                }}
              >
                S
              </span>
              SonicPesa
            </div>
            <p
              className="mt-4 max-w-sm text-[13px] leading-relaxed"
              style={{ color: TEXT_DIM }}
            >
              Engineered for performance. Optimized for commerce. Sustained by
              high-level encryption protocols.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <div
                className="font-mono text-[10.5px] tracking-[0.12em] uppercase"
                style={{ color: TEXT_DIM }}
              >
                {col.heading}
              </div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-[13px] transition-colors hover:text-white"
                      style={{ color: TEXT }}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <div
              className="font-mono text-[10.5px] tracking-[0.12em] uppercase"
              style={{ color: TEXT_DIM }}
            >
              Dispatch Log
            </div>
            <ul
              className="mt-4 space-y-2.5 text-[13px]"
              style={{ color: TEXT }}
            >
              <li>WhatsApp: +255 627 360 144</li>
              <li>Terminal: support@sonicpesa.com</li>
              <li
                className="flex items-center gap-1.5"
                style={{ color: TEXT_DIM }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: SIGNAL_GREEN }}
                />
                Sub-Nodes Online
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 border-t px-6 py-6 font-mono text-[10.5px] md:flex-row"
          style={{ borderColor: LINE, color: TEXT_DIM }}
        >
          <span>
            &copy; 2026 SonicPesa Infrastructure. SECURED_CREDENTIALS_V_2.0.8
          </span>
          <span>Distributed Financial Operating System</span>
        </div>
      </footer>
    </div>
  );
}
