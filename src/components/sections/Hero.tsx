// components/sections/Hero.tsx
import { Link } from "react-router-dom";
import { accentBorder, accentText, type Accent } from "../../lib/design-tokens";

import { type ReactNode } from "react";
import { IconFind, IconTransact, IconDeliver } from "./icons";

const flow: { key: Accent; label: string; icon: ReactNode }[] = [
  { key: "find", label: "Find", icon: <IconFind /> },
  { key: "transact", label: "Transact", icon: <IconTransact /> },
  { key: "deliver", label: "Deliver", icon: <IconDeliver /> },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Watermark: the logo, large and faint, anchored top-right */}
      <img
        src="/images/mainlogo.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] opacity-[0.05] dark:opacity-[0.08] sm:h-[520px] sm:w-[520px]"
      />

      <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-16 text-center sm:pb-28 sm:pt-24">
        {/* Badge */}
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#D0D7DE] bg-white/70 px-3.5 py-1.5 text-xs text-[#59636E] backdrop-blur-sm dark:border-[#30363D] dark:bg-[#0D1117]/70 dark:text-[#8B949E]">
          <img
            src="/images/mainlogo.png"
            alt=""
            aria-hidden="true"
            className="h-4 w-4 rounded-sm object-contain"
          />
          One connected ecosystem
        </div>

        <h1 className="mx-auto mt-6 max-w-2xl font-[Space_Grotesk,sans-serif] text-4xl font-medium leading-[1.1] tracking-tight text-[#1F2328] dark:text-[#E6EDF3] sm:text-6xl">
          Software that connects discovery, transactions, and delivery.
        </h1>

        <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-[#59636E] dark:text-[#8B949E]">
          MaishaSoft builds the platforms and partnerships that take people and
          businesses from finding what they need to getting it delivered —
          securely, end to end.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/signup"
            className="rounded-full bg-[#1F2328] px-5 py-2.5 text-sm text-white transition-colors hover:bg-black dark:bg-[#E6EDF3] dark:text-[#0D1117] dark:hover:bg-white"
          >
            Create an account
          </Link>
          <a
            href="#what-we-provide"
            className="rounded-full border border-[#D0D7DE] px-5 py-2.5 text-sm text-[#1F2328] transition-colors hover:border-[#1F2328] dark:border-[#30363D] dark:text-[#E6EDF3] dark:hover:border-[#E6EDF3]"
          >
            Explore our products
          </a>
        </div>

        {/* Find → Transact → Deliver, as a horizontal tag row instead of a circuit diagram */}
        <div className="mx-auto mt-14 flex max-w-md items-center justify-center gap-2 sm:gap-3">
          {flow.map((step, i) => (
            <div key={step.key} className="flex items-center gap-2 sm:gap-3">
              <div
                className={[
                  "flex items-center gap-2 rounded-full border bg-white px-3.5 py-2 dark:bg-[#0D1117] sm:px-4",
                  accentBorder[step.key],
                ].join(" ")}
              >
                <span className={accentText[step.key]}>{step.icon}</span>
                <span className="text-sm font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                  {step.label}
                </span>
              </div>
              {i < flow.length - 1 && (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="shrink-0 text-[#D0D7DE] dark:text-[#30363D]"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Stat strip — a different way of reinforcing scale/trust than the old diagram */}
        <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4 border-t border-[#D0D7DE] pt-8 dark:border-[#30363D]">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#8B949E]">
              Products
            </dt>
            <dd className="mt-1 font-[Space_Grotesk,sans-serif] text-2xl font-medium text-[#1F2328] dark:text-[#E6EDF3] sm:text-3xl">
              SaaS
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#8B949E]">
              Focus
            </dt>
            <dd className="mt-1 font-[Space_Grotesk,sans-serif] text-2xl font-medium text-[#1F2328] dark:text-[#E6EDF3] sm:text-3xl">
              Secure
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#8B949E]">
              Reach
            </dt>
            <dd className="mt-1 font-[Space_Grotesk,sans-serif] text-2xl font-medium text-[#1F2328] dark:text-[#E6EDF3] sm:text-3xl">
              End to end
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
