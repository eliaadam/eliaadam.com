// components/sections/Hero.tsx
import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { type Accent, accentBorder, accentText } from "../../lib/design-tokens";
import { IconDeliver, IconFind, IconTransact } from "./icons";

function FlowDiagram() {
  const nodes: {
    key: Accent;
    label: string;
    icon: ReactNode;
    cx: number;
    cy: number;
  }[] = [
    { key: "find", label: "Find", icon: <IconFind />, cx: 60, cy: 40 },
    {
      key: "transact",
      label: "Transact",
      icon: <IconTransact />,
      cx: 220,
      cy: 130,
    },
    {
      key: "deliver",
      label: "Deliver",
      icon: <IconDeliver />,
      cx: 60,
      cy: 220,
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-sm md:mt-4">
      <style>{`
        @keyframes maisha-flow {
          to { stroke-dashoffset: -200; }
        }
        .maisha-flow-path {
          stroke-dasharray: 5 7;
          animation: maisha-flow 6s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .maisha-flow-path { animation: none; }
        }
      `}</style>
      <svg viewBox="0 0 280 260" className="h-auto w-full">
        <path
          d="M60 40 C 160 40, 160 130, 220 130 C 160 130, 160 220, 60 220"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="maisha-flow-path text-[#D0D7DE] dark:text-[#30363D]"
        />
        {nodes.map((n) => (
          <g key={n.key}>
            <circle
              cx={n.cx}
              cy={n.cy}
              r="30"
              className={`fill-white dark:fill-[#0D1117] ${accentBorder[n.key]}`}
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </g>
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0">
        {nodes.map((n) => (
          <div
            key={n.key}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{
              left: `${(n.cx / 280) * 100}%`,
              top: `${(n.cy / 260) * 100}%`,
            }}
          >
            <span className={accentText[n.key]}>{n.icon}</span>
            <span className="text-xs text-[#59636E] dark:text-[#8B949E]">
              {n.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.1fr_0.9fr] md:pb-28 md:pt-24">
        <div>
          <h1 className="font-[Space_Grotesk,sans-serif] text-[2.6rem] font-medium leading-[1.08] tracking-tight text-[#1F2328] dark:text-[#E6EDF3] sm:text-6xl">
            Find what you need.
            <br />
            Transact with confidence.
            <br />
            Get it where it&apos;s going.
          </h1>

          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#59636E] dark:text-[#8B949E]">
            MaishaSoft builds the software, platforms, and partnerships that
            connect people and businesses — from discovery, through a secure
            transaction, to delivery.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#what-we-provide"
              className="rounded-md bg-[#1F2328] px-4 py-2 text-sm text-white transition-colors hover:bg-black dark:bg-[#E6EDF3] dark:text-[#0D1117] dark:hover:bg-white"
            >
              Explore our products
            </a>
            <Link
              to="/signup"
              className="rounded-md border border-[#D0D7DE] px-4 py-2 text-sm text-[#1F2328] transition-colors hover:border-[#1F2328] dark:border-[#30363D] dark:text-[#E6EDF3] dark:hover:border-[#E6EDF3]"
            >
              Create an account
            </Link>
          </div>
        </div>

        <FlowDiagram />
      </div>
    </section>
  );
}
