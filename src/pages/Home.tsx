import { useEffect, useRef, useState, type ReactNode } from "react";

const PILLARS: { title: string; body: string }[] = [
  {
    title: "Think Beyond",
    body: "Question what's normal. Explore ideas the timeline never taught you.",
  },
  {
    title: "Know Your Roots",
    body: "Carry your heritage forward — African identity worn with pride, not left behind.",
  },
  {
    title: "Find Your Power",
    body: "Step past self-doubt and discover who you actually are, then go be that.",
  },
  {
    title: "Know Your Rights",
    body: "Understand what you're owed. Speak up with facts, not guesses.",
  },
  {
    title: "Build & Provide",
    body: "Work, invest, start something. Long-term goals beat lucky breaks.",
  },
  {
    title: "Heal & Grow",
    body: "Mind, body, and habits — including the hard conversations about addiction.",
  },
  {
    title: "Rise Together",
    body: "Men leading with strength, women leading with clarity — balance, not competition.",
  },
  {
    title: "Uplift the Community",
    body: "Change that starts at home and moves outward — mentally, economically, spiritually.",
  },
];

const FORMATS = [
  "Interviews",
  "Open discussions",
  "Podcast segments",
  "Real stories",
];

/* --------------------------- helpers --------------------------- */

function NeedleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 19.5 17 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="18.5"
        cy="5.5"
        r="2.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M13.5 10.5c-2 1-4.5 2.2-6.5 1.8"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

/** Reveals children once, as they scroll into view. Cheap: one
 *  IntersectionObserver per node, disconnected after first trigger. */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-700 ease-out will-change-transform ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function PillarCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="group border border-neutral-200 dark:border-neutral-800 rounded-md p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm hover:border-black dark:hover:border-white dark:hover:bg-neutral-900">
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 transition-transform duration-300 group-hover:scale-110">
        <NeedleIcon className="w-4 h-4 text-black dark:text-white" />
      </div>
      <div className="text-sm font-semibold text-black dark:text-white mt-3">
        {title}
      </div>
      <p className="text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400 mt-1">
        {body}
      </p>
    </div>
  );
}

/** Thread motif: draws itself once on mount using the SVG `pathLength`
 *  trick, so the dash math stays simple regardless of actual geometry. */
function ThreadDivider() {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 120);
    return () => clearTimeout(t);
  }, []);
  return (
    <svg
      viewBox="0 0 400 24"
      className="w-full h-6 overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,12 C50,2 100,22 150,12 C200,2 250,22 300,12 C340,4 370,12 400,12"
        pathLength={100}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-black dark:text-white"
        style={{
          strokeDasharray: 100,
          strokeDashoffset: drawn ? 0 : 100,
          transition: "stroke-dashoffset 1.4s ease-out",
          opacity: 0.7,
        }}
      />
    </svg>
  );
}

/* ----------------------------- page ----------------------------- */

export default function Home() {
  return (
    <div className="sindano-page min-h-screen bg-white dark:bg-neutral-950 text-black dark:text-white">
      <style>{`
        @keyframes sindano-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
        }
        .sindano-float {
          animation: sindano-float 6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .sindano-page * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/80 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NeedleIcon className="w-4 h-4 text-black dark:text-white" />
            <span className="text-sm font-semibold tracking-tight text-black dark:text-white">
              Sindano Show
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wide text-neutral-400 hidden sm:inline">
            Dar es Salaam · Tanzania
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 relative overflow-hidden">
        <NeedleIcon className="hidden sm:block sindano-float absolute -right-2 top-10 w-16 h-16 text-neutral-100 dark:text-neutral-900" />
        <Reveal>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-4">
            A movement, not a program
          </div>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight text-black dark:text-white leading-[0.95]">
            SINDANO
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="text-lg sm:text-xl text-neutral-500 dark:text-neutral-400 mt-3 font-medium">
            Expanding horizons, embracing roots.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-400 mt-5 max-w-xl">
            A platform for Tanzanian youth to think past what's familiar,
            without losing hold of where they come from — through honest
            conversation, practical guidance, and stories worth staying up for.
          </p>
        </Reveal>
        <Reveal delay={320}>
          <div className="flex flex-wrap gap-2 mt-7">
            <button className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]">
              Watch an episode
            </button>
            <button className="px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 text-black dark:text-white transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
              Follow the movement
            </button>
          </div>
        </Reveal>
        <Reveal delay={400} className="mt-10">
          <ThreadDivider />
        </Reveal>
      </section>

      {/* Pillars */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <Reveal>
          <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">
            What the show is for
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-black dark:text-white mb-6">
            Eight things worth pushing on
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={(i % 4) * 70}>
              <PillarCard {...p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Formats + audience */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-5 sm:p-6">
          <Reveal>
            <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">
              How we get there
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {FORMATS.map((f) => (
                <span
                  key={f}
                  className="text-[11px] px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                >
                  {f}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              For young men finding their footing. For young women owning their
              voice. For families rebuilding trust. For a generation of children
              watching how it's done.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Statement */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
        <Reveal>
          <NeedleIcon className="w-6 h-6 text-black dark:text-white mx-auto mb-5" />
          <p className="text-xl sm:text-2xl font-medium text-black dark:text-white leading-snug">
            We break the mold, not the roots — pairing a wider view of the world
            with a firmer grip on where we're from.
          </p>
        </Reveal>
      </section>

      {/* Footer CTA */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-black dark:text-white">
              Sindano Show
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              Rooted in Africa. Reaching forward.
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
              Episodes
            </button>
            <button className="px-3 py-1.5 text-xs rounded-md bg-black text-white dark:bg-white dark:text-black transition-transform duration-200 hover:scale-[1.03]">
              Join the movement
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
