/* eslint-disable react-hooks/set-state-in-effect */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * MaishaSoft — Marketing homepage
 * Find. Transact. Deliver.
 *
 * Single-file, dependency-free (React + Tailwind only).
 * Supports light/dark mode via a `dark` class on <html>, toggleable in the header.
 */

/* -------------------------------------------------------------------------- */
/*  Small utilities                                                          */
/* -------------------------------------------------------------------------- */

/** Reveals an element with a fade/rise once it scrolls into view. Used sparingly — section intros only. */
function useReveal<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

type Accent = "find" | "transact" | "deliver";

const accentText: Record<Accent, string> = {
  find: "text-[#0969DA] dark:text-[#4493F8]",
  transact: "text-[#8250DF] dark:text-[#A371F7]",
  deliver: "text-[#1A7F37] dark:text-[#3FB950]",
};

const accentBorder: Record<Accent, string> = {
  find: "border-[#0969DA] dark:border-[#4493F8]",
  transact: "border-[#8250DF] dark:border-[#A371F7]",
  deliver: "border-[#1A7F37] dark:border-[#3FB950]",
};

const accentBg: Record<Accent, string> = {
  find: "bg-[#0969DA] dark:bg-[#4493F8]",
  transact: "bg-[#8250DF] dark:bg-[#A371F7]",
  deliver: "bg-[#1A7F37] dark:bg-[#3FB950]",
};

/* -------------------------------------------------------------------------- */
/*  Icons (inline, no external icon library)                                 */
/* -------------------------------------------------------------------------- */

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconFind = () => (
  <svg {...iconProps}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M20 20l-4.8-4.8" />
  </svg>
);

const IconTransact = () => (
  <svg {...iconProps}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
);

const IconDeliver = () => (
  <svg {...iconProps}>
    <path d="M3 8.5l9-5 9 5-9 5-9-5z" />
    <path d="M3 8.5V16l9 5 9-5V8.5" />
    <path d="M12 13.5V21" />
  </svg>
);

const IconSaas = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);

const IconPlatform = () => (
  <svg {...iconProps}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
);

const IconServices = () => (
  <svg {...iconProps}>
    <path d="M14.7 3.3a4 4 0 00-5.4 5.4L3 15l3 3 6.3-6.3a4 4 0 005.4-5.4l-3.1 3.1-2-2 3.1-3.1z" />
  </svg>
);

const IconPartnership = () => (
  <svg {...iconProps}>
    <circle cx="8" cy="8" r="3.2" />
    <circle cx="16" cy="16" r="3.2" />
    <path d="M10.3 10.3l3.4 3.4" />
  </svg>
);

const IconIndividuals = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
  </svg>
);

const IconBusinesses = () => (
  <svg {...iconProps}>
    <rect x="4" y="9" width="16" height="11" rx="1" />
    <path d="M9 9V6a3 3 0 016 0v3" />
  </svg>
);

const IconOrganizations = () => (
  <svg {...iconProps}>
    <path d="M4 20V9l8-5 8 5v11" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

const IconDevelopers = () => (
  <svg {...iconProps}>
    <path d="M8 8L3.5 12 8 16M16 8l4.5 4-4.5 4M13.5 6l-3 12" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */

function Header({
  isDark,
  onToggleTheme,
}: {
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "What we do", href: "#what-we-do" },
    { label: "What we provide", href: "#what-we-provide" },
    { label: "Why MaishaSoft", href: "#why" },
    { label: "Get in touch", href: "#contact" },
  ];

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled
          ? "bg-white/80 dark:bg-[#0D1117]/80 backdrop-blur-md border-b border-[#D0D7DE] dark:border-[#30363D]"
          : "bg-transparent border-b border-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a
          href="#top"
          className="font-[Space_Grotesk,sans-serif] text-lg font-medium tracking-tight text-[#1F2328] dark:text-[#E6EDF3]"
        >
          Maisha
          <span className="font-normal text-[#59636E] dark:text-[#8B949E]">
            Soft
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[#59636E] transition-colors hover:text-[#1F2328] dark:text-[#8B949E] dark:hover:text-[#E6EDF3]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleTheme}
            aria-label="Toggle dark mode"
            className="grid h-8 w-8 place-items-center rounded-md border border-[#D0D7DE] text-[#59636E] transition-colors hover:border-[#1F2328] hover:text-[#1F2328] dark:border-[#30363D] dark:text-[#8B949E] dark:hover:border-[#E6EDF3] dark:hover:text-[#E6EDF3]"
          >
            {isDark ? (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
              </svg>
            ) : (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
              </svg>
            )}
          </button>

          <a
            href="#contact"
            className="hidden rounded-md bg-[#1F2328] px-3.5 py-1.5 text-sm text-white transition-colors hover:bg-black dark:bg-[#E6EDF3] dark:text-[#0D1117] dark:hover:bg-white sm:inline-block"
          >
            Get in touch
          </a>

          <button
            className="grid h-8 w-8 place-items-center rounded-md border border-[#D0D7DE] text-[#59636E] dark:border-[#30363D] dark:text-[#8B949E] md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-[#D0D7DE] bg-white px-6 py-4 dark:border-[#30363D] dark:bg-[#0D1117] md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm text-[#59636E] dark:text-[#8B949E]"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                      */
/* -------------------------------------------------------------------------- */

function Hero() {
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
            <a
              href="#contact"
              className="rounded-md border border-[#D0D7DE] px-4 py-2 text-sm text-[#1F2328] transition-colors hover:border-[#1F2328] dark:border-[#30363D] dark:text-[#E6EDF3] dark:hover:border-[#E6EDF3]"
            >
              Partner with us
            </a>
          </div>
        </div>

        <FlowDiagram />
      </div>
    </section>
  );
}

/** The single orchestrated motion moment on the page: a circuit connecting Find → Transact → Deliver. */
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

/* -------------------------------------------------------------------------- */
/*  Section heading (reveal-on-scroll, used once per section)                */
/* -------------------------------------------------------------------------- */

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={[
        "max-w-xl transition-all duration-700 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      ].join(" ")}
    >
      {eyebrow && (
        <p className="mb-2 text-sm text-[#59636E] dark:text-[#8B949E]">
          {eyebrow}
        </p>
      )}
      <h2 className="font-[Space_Grotesk,sans-serif] text-2xl font-medium tracking-tight text-[#1F2328] dark:text-[#E6EDF3] sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-[15px] leading-relaxed text-[#59636E] dark:text-[#8B949E]">
          {description}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  What we do — Find / Transact / Deliver                                   */
/* -------------------------------------------------------------------------- */

function WhatWeDo() {
  const items: { key: Accent; icon: ReactNode; title: string; body: string }[] =
    [
      {
        key: "find",
        icon: <IconFind />,
        title: "Find",
        body: "Digital spaces that make it easy to discover products, services, opportunities, and resources — helping people find what they need, faster.",
      },
      {
        key: "transact",
        icon: <IconTransact />,
        title: "Transact",
        body: "Secure technology that makes transactions easier, safer, and more reliable — helping people and businesses transact with confidence.",
      },
      {
        key: "deliver",
        icon: <IconDeliver />,
        title: "Deliver",
        body: "Technology that connects transactions with fulfillment and logistics — helping products and services reach where they need to go.",
      },
    ];

  return (
    <section
      id="what-we-do"
      className="border-t border-[#D0D7DE] py-20 dark:border-[#30363D]"
    >
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro
          title="What we do"
          description="Three parts of the digital business experience, brought together as one connected circle."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.key}
              className={[
                "group rounded-lg border border-[#D0D7DE] bg-white p-6 transition-all duration-300 dark:border-[#30363D] dark:bg-[#0D1117]",
                "hover:-translate-y-1 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]",
                "border-t-2",
                accentBorder[item.key],
              ].join(" ")}
            >
              <span className={`inline-flex ${accentText[item.key]}`}>
                {item.icon}
              </span>
              <h3 className="mt-4 font-[Space_Grotesk,sans-serif] text-lg font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#59636E] dark:text-[#8B949E]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  What we provide                                                          */
/* -------------------------------------------------------------------------- */

function WhatWeProvide() {
  const items = [
    {
      icon: <IconSaas />,
      title: "SaaS products",
      body: "Software that businesses and organizations use to run, manage, and grow their operations — built to solve real problems without unnecessary complexity.",
    },
    {
      icon: <IconPlatform />,
      title: "Digital platforms",
      body: "Digital spaces where people and businesses discover, connect, exchange value, and access products and services.",
    },
    {
      icon: <IconServices />,
      title: "Services",
      body: "Technology-enabled services that extend beyond software, helping individuals and organizations accomplish more.",
    },
    {
      icon: <IconPartnership />,
      title: "Partnerships",
      body: "Collaboration with organizations to connect capabilities, integrate systems, and build solutions the whole ecosystem benefits from.",
    },
  ];

  return (
    <section
      id="what-we-provide"
      className="border-t border-[#D0D7DE] py-20 dark:border-[#30363D]"
    >
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro title="What we provide" />

        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[#D0D7DE] bg-[#D0D7DE] dark:border-[#30363D] dark:bg-[#30363D] sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.title}
              className="group bg-white p-6 transition-colors duration-300 hover:bg-[#F6F8FA] dark:bg-[#0D1117] dark:hover:bg-[#161B22]"
            >
              <span className="inline-flex text-[#1F2328] transition-transform duration-300 group-hover:-translate-y-0.5 dark:text-[#E6EDF3]">
                {item.icon}
              </span>
              <h3 className="mt-4 text-[15px] font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#59636E] dark:text-[#8B949E]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Value we deliver                                                         */
/* -------------------------------------------------------------------------- */

function ValueWeDeliver() {
  const items = [
    {
      title: "Simplicity",
      body: "We remove unnecessary complexity from products, processes, and interactions so people can focus on what matters.",
      line: "Simple experiences. Simple operations. Simple technology.",
    },
    {
      title: "Security",
      body: "We build our products and services with security at their foundation, protecting the information and transactions our ecosystem depends on.",
      line: "Secure by design. Trusted by default.",
    },
    {
      title: "Better products and services",
      body: "We focus on quality, usability, reliability, and continuous improvement to create experiences that are useful today and better tomorrow.",
      line: "Built with purpose. Built to deliver value.",
    },
  ];

  return (
    <section className="border-t border-[#D0D7DE] bg-[#F6F8FA] py-20 dark:border-[#30363D] dark:bg-[#161B22]">
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro title="The value we deliver" />

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.title}>
              <h3 className="font-[Space_Grotesk,sans-serif] text-lg font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#59636E] dark:text-[#8B949E]">
                {item.body}
              </p>
              <p className="mt-4 text-sm italic text-[#1F2328] dark:text-[#E6EDF3]">
                {item.line}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Why MaishaSoft — scroll-sequenced steps                                  */
/* -------------------------------------------------------------------------- */

function WhyMaishaSoft() {
  const steps = [
    {
      key: "find" as Accent,
      label: "Find",
      body: "A person can find what they need.",
    },
    {
      key: "transact" as Accent,
      label: "Transact",
      body: "They can transact securely.",
    },
    {
      key: "deliver" as Accent,
      label: "Receive",
      body: "They can receive what they purchased.",
    },
  ];

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && active === -1) {
            steps.forEach((_, i) => {
              timers.push(setTimeout(() => setActive(i), i * 450));
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      id="why"
      ref={sectionRef}
      className="border-t border-[#D0D7DE] py-20 dark:border-[#30363D]"
    >
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro
          title="We connect the entire experience"
          description="Finding something, buying it, and getting it delivered shouldn't feel like three disconnected activities."
        />

        <div className="mt-14 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {steps.map((step, i) => (
            <React.Fragment key={step.key}>
              <div
                className={[
                  "flex-1 rounded-lg border p-5 transition-all duration-500",
                  active >= i
                    ? `${accentBorder[step.key]} bg-white dark:bg-[#0D1117]`
                    : "border-[#D0D7DE] bg-white opacity-40 dark:border-[#30363D] dark:bg-[#0D1117]",
                ].join(" ")}
              >
                <span
                  className={[
                    "mb-3 inline-block h-2 w-2 rounded-full transition-colors duration-500",
                    active >= i
                      ? accentBg[step.key]
                      : "bg-[#D0D7DE] dark:bg-[#30363D]",
                  ].join(" ")}
                />
                <h3 className="text-[15px] font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                  {step.label}
                </h3>
                <p className="mt-1 text-sm text-[#59636E] dark:text-[#8B949E]">
                  {step.body}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={[
                    "hidden h-px flex-none origin-left bg-[#D0D7DE] transition-transform duration-500 dark:bg-[#30363D] sm:block sm:w-8",
                    active > i ? "scale-x-100" : "scale-x-0",
                  ].join(" ")}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[#59636E] dark:text-[#8B949E]">
          Businesses participate in the same ecosystem to offer products,
          provide services, manage operations, and reach customers.
          Organizations collaborate with us to extend their capabilities and
          create new possibilities.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Built for everyone                                                       */
/* -------------------------------------------------------------------------- */

function BuiltForEveryone() {
  const personas = [
    {
      icon: <IconIndividuals />,
      title: "Individuals",
      body: "Discover products, services, and opportunities through simple digital experiences.",
    },
    {
      icon: <IconBusinesses />,
      title: "Businesses",
      body: "Reach customers, manage operations, transact, and fulfill demand through connected technology.",
    },
    {
      icon: <IconOrganizations />,
      title: "Organizations",
      body: "Collaborate, integrate, and build new solutions through our platform and technology capabilities.",
    },
    {
      icon: <IconDevelopers />,
      title: "Developers and partners",
      body: "Connect with an ecosystem designed to enable new products, services, and integrations.",
    },
  ];

  return (
    <section className="border-t border-[#D0D7DE] bg-[#F6F8FA] py-20 dark:border-[#30363D] dark:bg-[#161B22]">
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro title="Built for everyone in the ecosystem" />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((p) => (
            <div
              key={p.title}
              className="rounded-lg border border-[#D0D7DE] bg-white p-6 transition-colors duration-300 hover:border-[#1F2328] dark:border-[#30363D] dark:bg-[#0D1117] dark:hover:border-[#E6EDF3]"
            >
              <span className="inline-flex text-[#1F2328] dark:text-[#E6EDF3]">
                {p.icon}
              </span>
              <h3 className="mt-4 text-[15px] font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#59636E] dark:text-[#8B949E]">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Philosophy — hover to reveal                                             */
/* -------------------------------------------------------------------------- */

function Philosophy() {
  const questions = [
    {
      q: "Can we make it simpler?",
      a: "We remove steps, screens, and jargon until only what's useful remains.",
    },
    {
      q: "Can we make it more secure?",
      a: "We design protection in from the start, not as a feature bolted on later.",
    },
    {
      q: "Can we make it better?",
      a: "We treat every release as a chance to improve on what came before.",
    },
  ];

  return (
    <section className="border-t border-[#D0D7DE] py-20 dark:border-[#30363D]">
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro
          title="Technology should work for people"
          description="We don't build because something can be built. We build because there is a problem worth solving."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {questions.map((item) => (
            <div
              key={item.q}
              className="group relative overflow-hidden rounded-lg border border-[#D0D7DE] bg-white p-6 dark:border-[#30363D] dark:bg-[#0D1117]"
            >
              <p className="font-[Space_Grotesk,sans-serif] text-lg font-medium text-[#1F2328] transition-opacity duration-300 group-hover:opacity-0 dark:text-[#E6EDF3]">
                {item.q}
              </p>
              <p className="absolute inset-0 flex translate-y-2 items-center bg-white p-6 text-sm leading-relaxed text-[#59636E] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 dark:bg-[#0D1117] dark:text-[#8B949E]">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Closing CTA                                                              */
/* -------------------------------------------------------------------------- */

function ClosingCta() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  return (
    <section
      id="contact"
      ref={ref}
      onMouseMove={onMouseMove}
      className="relative overflow-hidden border-t border-[#D0D7DE] bg-[#1F2328] py-24 dark:border-[#30363D] dark:bg-[#010409]"
    >
      <div
        className="pointer-events-none absolute h-72 w-72 rounded-full opacity-25 blur-3xl transition-all duration-300"
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, #4493F8 0%, #A371F7 45%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-[Space_Grotesk,sans-serif] text-3xl font-medium tracking-tight text-white sm:text-4xl">
          Build with MaishaSoft
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#8B949E]">
          Whether you&apos;re looking for a digital product, a business
          solution, a technology partnership, or a better way to serve your
          customers — let&apos;s build something better.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#what-we-provide"
            className="rounded-md bg-white px-4 py-2 text-sm text-[#1F2328] transition-colors hover:bg-[#E6EDF3]"
          >
            Explore our products
          </a>
          <a
            href="#why"
            className="rounded-md border border-[#30363D] px-4 py-2 text-sm text-white transition-colors hover:border-white"
          >
            Partner with us
          </a>
          <a
            href="mailto:hello@maishasoft.com"
            className="rounded-md border border-[#30363D] px-4 py-2 text-sm text-white transition-colors hover:border-white"
          >
            Get in touch
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#1F2328] py-8 dark:bg-[#010409]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-[#8B949E] sm:flex-row">
        <span>
          © {new Date().getFullYear()} MaishaSoft. All rights reserved.
        </span>
        <span>Simple. Secure. Better.</span>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <div className="min-h-screen bg-white text-[#1F2328] antialiased dark:bg-[#0D1117] dark:text-[#E6EDF3]">
      <Header isDark={isDark} onToggleTheme={() => setIsDark((v) => !v)} />
      <main>
        <Hero />
        <WhatWeDo />
        <WhatWeProvide />
        <ValueWeDeliver />
        <WhyMaishaSoft />
        <BuiltForEveryone />
        <Philosophy />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
