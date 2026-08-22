/**
 * Home.tsx — MaishaSoft
 *
 * Fonts (add to your index.html <head>, or swap for local fonts):
 * <link rel="preconnect" href="https://fonts.googleapis.com">
 * <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="">
 * <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
 *
 * Pure black / white / grayscale, Tailwind CSS only.
 * Light mode = white background everywhere. Dark mode = black background
 * everywhere. No section forces the opposite theme's colors — sections are
 * only ever distinguished with borders and low-opacity tints, not swapped
 * backgrounds, so nothing goes "dark" while the page is in light mode.
 *
 * Interactivity is kept deliberately cheap: transform/opacity-only CSS
 * animations (GPU-composited), a single rAF-throttled pointer listener for
 * hero parallax, and IntersectionObserver-driven one-shot reveals — nothing
 * that recalculates layout on every frame.
 */

import React, { useEffect, useRef, useState } from "react";

function useInView<T extends Element>() {
  const [element, setElement] = useState<T | null>(null);
  const [inView, setInView] = useState(false);

  const ref = React.useCallback((node: T | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { ref, inView };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Furrow rows that draw themselves in once scrolled into view — reads as
// both tilled soil and rows of data. Pure stroke-dashoffset transition,
// cheap and GPU-friendly.
function FurrowField({
  className = "",
  svgRef,
}: {
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
}) {
  const { ref, inView } = useInView<SVGSVGElement>();
  const [svgNode, setSvgNode] = useState<SVGSVGElement | null>(null);
  const rows = 9;

  React.useImperativeHandle(svgRef, () => svgNode!, [svgNode]);

  const handleRef = React.useCallback(
    (node: SVGSVGElement | null) => {
      ref(node);
      setSvgNode(node);
    },
    [ref],
  );

  return (
    <svg
      ref={handleRef}
      viewBox="0 0 800 200"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <path
          key={i}
          d={`M0 ${20 + i * 20} Q 200 ${5 + i * 20} 400 ${20 + i * 20} T 800 ${20 + i * 20}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity={0.55 - i * 0.03}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={inView ? 0 : 1}
          style={{
            transition: "stroke-dashoffset 1.4s ease-out",
            transitionDelay: `${i * 60}ms`,
          }}
        />
      ))}
    </svg>
  );
}

// A concentric sun mark. The outer ring is a dashed circle that spins
// slowly and continuously — a single cheap CSS transform: rotate() animation,
// paused for reduced-motion users.
function Sun() {
  return (
    <div className="group relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full animate-[spin-slow_18s_linear_infinite] text-black/25 transition-colors duration-300 group-hover:text-black/60 motion-reduce:animate-none dark:text-white/25 dark:group-hover:text-white/60"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 10"
        />
      </svg>
      <div className="absolute inset-[14%] rounded-full bg-black transition-transform duration-500 group-hover:scale-105 dark:bg-white" />
      <div className="absolute inset-[34%] rounded-full bg-white dark:bg-black" />
      <div className="absolute inset-[46%] rounded-full bg-black dark:bg-white" />
    </div>
  );
}

// A hand-drawn ascending line — the "growth" signature. Draws in once,
// on scroll, via stroke-dashoffset; nodes fade in staggered after.
function GrowthLine({ className = "" }: { className?: string }) {
  const { ref, inView } = useInView<SVGSVGElement>();
  const points = [
    [0, 90],
    [60, 78],
    [130, 82],
    [200, 55],
    [270, 60],
    [340, 30],
    [400, 15],
  ];
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`)
    .join(" ");
  return (
    <svg
      ref={ref}
      viewBox="0 0 400 100"
      className={className}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={inView ? 0 : 1}
        style={{ transition: "stroke-dashoffset 1.6s ease-out" }}
      />
      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={3}
          fill="currentColor"
          style={{
            opacity: inView ? 1 : 0,
            transition: "opacity 0.4s ease-out",
            transitionDelay: `${300 + i * 140}ms`,
          }}
        />
      ))}
    </svg>
  );
}

// A card that tilts gently toward the cursor. Listener is scoped to the
// card itself and only writes a CSS custom property + transform — no
// layout reads/writes beyond getBoundingClientRect on move.
function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    const { clientX, clientY } = e;
    frame.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width - 0.5;
      const py = (clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty("--tiltX", `${(-py * 6).toFixed(2)}deg`);
      el.style.setProperty("--tiltY", `${(px * 6).toFixed(2)}deg`);
    });
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tiltX", "0deg");
    el.style.setProperty("--tiltY", "0deg");
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`[transform:perspective(800px)_rotateX(var(--tiltX,0deg))_rotateY(var(--tiltY,0deg))] transition-transform duration-200 ease-out will-change-transform motion-reduce:!transform-none ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const strategicVision = [
  {
    letter: "a",
    title: "Strengthen the management of agricultural production",
    body: "Build systems that give farmers, cooperatives, institutions, and agribusinesses the ability to manage their records accurately, plan production, and follow market trends.",
  },
  {
    letter: "b",
    title: "Add value across the entire agricultural chain",
    body: "Our solutions are never built for farmers alone — they reach processors, buyers, distributors, and policymakers, strengthening the full value chain.",
  },
  {
    letter: "c",
    title: "Help agriculture modernize and go digital",
    body: "We're accelerating the shift from traditional methods toward decisions driven by accurate data — raising yields, cutting costs, and reducing unpredictable risk.",
  },
  {
    letter: "d",
    title: "Lay the groundwork to expand into new sectors",
    body: "Agriculture comes first, but the strategy is built to carry the same principles — simplicity, quality, and security — into health, education, commerce, transport, and beyond.",
  },
];

const values = [
  {
    letter: "a",
    title: "Innovation",
    body: "We treat creativity as a tool for solving real problems. Every product we ship has to be genuinely useful and answer a need people actually have.",
  },
  {
    letter: "b",
    title: "Integrity",
    body: "We commit to working with transparency, honesty, and accountability toward our customers, our partners, and the public.",
  },
  {
    letter: "c",
    title: "Simplicity",
    body: "Our technology has to be usable by people who aren't technical. We build things that are reachable and easy to understand.",
  },
  {
    letter: "d",
    title: "Security",
    body: "Data security, transaction security, and system security are the foundation of everything we build. We take protecting our users' information seriously.",
  },
  {
    letter: "e",
    title: "Efficiency & Quality",
    body: "Every solution has to meet a high standard, perform well, and actually accomplish what the user set out to do — without wasting resources.",
  },
  {
    letter: "f",
    title: "Impact to Society",
    body: "We build technology that touches people's lives, raises productivity, and contributes to the development of whole sectors and communities.",
  },
];

const goals = [
  "Build and deliver apps that help farmers increase output through timely information — weather, markets, inputs, and best practice.",
  "Widen access to real data so producers and traders can make sound decisions.",
  "Help agricultural stakeholders — cooperatives, companies, and farmer groups — use modern systems to manage resources, sales, production, and supply.",
  "Increase returns for farmers of every size through friendly, secure, affordable systems that make tracking their operations easy.",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Home() {
  // Subtle hero parallax: furrow field drifts a few px against the cursor.
  // Single listener, rAF-throttled, transform-only — cheap even on low-end
  // devices, and skipped entirely for reduced-motion users.
  const heroRef = useRef<HTMLDivElement>(null);
  const heroFieldRef = useRef<SVGSVGElement>(null);
  const heroFrame = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const section = heroRef.current;
    const field = heroFieldRef.current;
    if (!section || !field) return;

    const onMove = (e: MouseEvent) => {
      if (heroFrame.current) cancelAnimationFrame(heroFrame.current);
      heroFrame.current = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        field.style.transform = `translateX(${(px * 10).toFixed(1)}px)`;
      });
    };

    section.addEventListener("mousemove", onMove);
    return () => {
      section.removeEventListener("mousemove", onMove);
      if (heroFrame.current) cancelAnimationFrame(heroFrame.current);
    };
  }, []);

  return (
    <div
      className="bg-white text-black antialiased dark:bg-black dark:text-white"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Custom keyframes not covered by default Tailwind utilities. */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ---------------------------------------------------------------- */}
      {/* NAV                                                              */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            MaishaSoft
          </span>
          <nav className="hidden gap-8 text-sm font-medium text-black/70 dark:text-white/70 sm:flex">
            {[
              ["#vision", "Vision"],
              ["#agriculture", "Agriculture"],
              ["#values", "Values"],
              ["#story", "Our story"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="group relative py-1 hover:text-black dark:hover:text-white"
              >
                {label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-black transition-transform duration-300 ease-out group-hover:scale-x-100 dark:bg-white" />
              </a>
            ))}
          </nav>
          <a
            href="#agriculture"
            className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 dark:bg-white dark:text-black"
          >
            See the mission
          </a>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* HERO                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section
        ref={heroRef}
        className="relative overflow-hidden border-b border-black/10 dark:border-white/10"
      >
        <FurrowField
          svgRef={heroFieldRef}
          className="pointer-events-none absolute -bottom-6 left-0 h-40 w-full text-black/10 transition-transform duration-300 ease-out dark:text-white/10 sm:h-56"
        />

        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24 md:pt-28">
          <Reveal>
            <div className="mb-8 flex items-center gap-4">
              <Sun />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
                Our purpose
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1
              className="max-w-3xl text-[2.5rem] font-semibold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Make life simple.
              <br />
              Make life safe.
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-black/70 dark:text-white/70 sm:text-lg">
              MaishaSoft exists to put technology to work for human wellbeing —
              cutting the friction out of everyday tasks, raising efficiency,
              and building systems that protect people's information, property,
              and livelihoods. From the smallholder farmer to the enterprise,
              everyone deserves digital services that remove needless difficulty
              and add real security.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* VISION                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section
        id="vision"
        className="border-b border-black/10 dark:border-white/10"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-[280px_1fr] md:gap-16 md:py-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
              Our vision
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div>
              <h2
                className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Make technology simple, beautiful, and safe.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-black/70 dark:text-white/70 sm:text-lg">
                This vision guides MaishaSoft's long journey. We're building a
                world where technology doesn't feel complicated or reserved for
                experts, but like a friend to anyone. Simple means clear,
                usable, without friction. Beautiful means thoughtful design and
                a genuinely good user experience. Safe means holding a high
                standard for protecting information and systems.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-black/70 dark:text-white/70 sm:text-lg">
                In reaching for this vision, MaishaSoft aims to lead in building
                products and services that answer what communities actually need
                — trustworthy, and built to move with the world's changing
                technology.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* AGRICULTURE / GOALS                                              */}
      {/* ---------------------------------------------------------------- */}
      {/* Tinted with low-opacity black/white only — never a hard-coded    */}
      {/* opposite-theme background, so light mode always stays light.    */}
      <section
        id="agriculture"
        className="relative border-b border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]"
      >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
              Our goal
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2
              className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Helping agriculture grow, one digital solution at a time.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-black/70 dark:text-white/70 sm:text-lg">
              Agriculture is the backbone of the economy across much of East
              Africa, yet it's often the last sector to benefit from technology.
              MaishaSoft is here to change that.
            </p>
          </Reveal>

          <Reveal delay={180}>
            <GrowthLine className="mt-10 h-20 w-full max-w-md text-black/70 dark:text-white/70" />
          </Reveal>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
            {goals.map((goal, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="h-full bg-white p-6 dark:bg-black sm:p-8">
                  <span className="mb-4 inline-block h-2 w-2 rounded-full bg-black dark:bg-white" />
                  <p className="text-sm leading-relaxed text-black/80 dark:text-white/80 sm:text-base">
                    {goal}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* STRATEGIC VISION                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
              Strategic vision
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2
              className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              A digital environment built for every stage of production.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {strategicVision.map((item, i) => (
              <Reveal key={item.letter} delay={i * 80}>
                <TiltCard>
                  <div className="group h-full rounded-2xl border border-black/10 p-6 transition-colors hover:border-black/30 dark:border-white/10 dark:hover:border-white/30 sm:p-8">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-sm font-semibold text-black/60 dark:text-white/60">
                        {item.letter}
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-black transition-transform duration-300 group-hover:scale-150 dark:bg-white" />
                    </div>
                    <h3
                      className="mt-4 text-lg font-semibold leading-snug sm:text-xl"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-black/65 dark:text-white/65 sm:text-base">
                      {item.body}
                    </p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* VALUES                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section
        id="values"
        className="border-b border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]"
      >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
              What guides us
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2
              className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Six values, one standard.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.letter} delay={i * 60}>
                <TiltCard>
                  <div className="h-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/10 transition-shadow duration-300 hover:shadow-md dark:bg-black dark:ring-white/10">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black font-mono text-xs font-semibold text-white transition-transform duration-300 hover:rotate-12 dark:bg-white dark:text-black">
                        {v.letter}
                      </span>
                      <h3
                        className="text-base font-semibold sm:text-lg"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {v.title}
                      </h3>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-black/65 dark:text-white/65">
                      {v.body}
                    </p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* MISSION NARRATIVE                                                */}
      {/* ---------------------------------------------------------------- */}
      <section
        id="story"
        className="border-b border-black/10 dark:border-white/10"
      >
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 md:py-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
              Our story
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2
              className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Why purpose, vision, and goal fit together.
            </h2>
          </Reveal>

          <Reveal delay={160}>
            <div className="mt-10 space-y-6 border-l-2 border-black pl-6 text-base leading-relaxed text-black/75 dark:border-white dark:text-white/75 sm:pl-8 sm:text-lg">
              <p>
                MaishaSoft was founded on the belief that technology doesn't
                have to be complicated, expensive, or reserved for the few. Our
                mission is to use technology to improve human life — by making
                it simple, good, and safe. That mission reflects our position
                that the real value of technology is measured by how much it
                improves everyday work, reduces risk, and adds security and
                efficiency.
              </p>
              <p>
                In this first stage of the journey, MaishaSoft has built a
                strategy directed at agriculture — a sector that has long
                carried the economy, yet has often been left behind when it
                comes to technology. Here, we see a real opportunity to bring
                change through digital systems that help farmers, institutions
                and every stakeholder make decisions from good data, manage
                production well, reach markets easily, and cut waste.
              </p>
              <p>
                These solutions are meant to strip away the everyday difficulty
                of a farmer's work and add security to their information and
                operations — a direct line back to our core purpose: to make
                human life simple and safe.
              </p>
              <p>
                At the same time, we keep building on a foundation of quality,
                innovation, security, and simplicity — values that will stay our
                backbone even as we move into new sectors. Our long-term vision,
                to make technology simple, good, and safe, is the light guiding
                MaishaSoft's journey toward solutions that will, in time, reach
                far beyond agriculture.
              </p>
              <p className="font-medium text-black dark:text-white">
                Together, our purpose, vision, and goal tell one clear story:
                MaishaSoft exists to strengthen life, grow production, and build
                an economic future rooted in knowledge and secure technology.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FOOTER                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="bg-white text-black dark:bg-black dark:text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div>
            <span
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              MaishaSoft
            </span>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-black/60 dark:text-white/60">
              Make life simple. Make life safe.
            </p>
          </div>
          <div className="flex gap-6 text-sm text-black/60 dark:text-white/60">
            <a
              href="#vision"
              className="hover:text-black dark:hover:text-white"
            >
              Vision
            </a>
            <a
              href="#agriculture"
              className="hover:text-black dark:hover:text-white"
            >
              Agriculture
            </a>
            <a
              href="#values"
              className="hover:text-black dark:hover:text-white"
            >
              Values
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
