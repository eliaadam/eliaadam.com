import { useEffect, useState, type JSX } from "react";
import {
  MapPin,
  Mail,
  Phone,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

interface SolutionItem {
  num: string;
  name: string;
  href: string;
}

interface SolutionGroup {
  category: string;
  items: SolutionItem[];
}

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  location: string;
}

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface NavLink {
  label: string;
  href: string;
}

interface Stat {
  value: string;
  label: string;
}

type Theme = "light" | "dark";

/* ── Social icons (inline SVG — lucide-react no longer ships brand icons) ─ */

interface IconProps {
  size?: number;
  className?: string;
}

function FacebookIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.99 3.657 9.128 8.438 9.878v-6.987H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.99 22 12z" />
    </svg>
  );
}

function InstagramIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 17.34V10.4H6.03v6.94h2.31zM7.19 9.42a1.34 1.34 0 1 0 0-2.68 1.34 1.34 0 0 0 0 2.68zm10.15 7.92v-3.8c0-2.03-1.08-2.97-2.53-2.97-1.17 0-1.69.64-1.98 1.09v-.94h-2.3c.03.65 0 6.94 0 6.94h2.3v-3.88c0-.2.02-.41.08-.56.16-.41.54-.84 1.18-.84.83 0 1.16.63 1.16 1.56v3.72h2.31z" />
    </svg>
  );
}

const socialLinks: {
  Icon: (p: IconProps) => JSX.Element;
  label: string;
  href: string;
}[] = [
  { Icon: FacebookIcon, label: "Facebook", href: "#" },
  { Icon: InstagramIcon, label: "Instagram", href: "#" },
  { Icon: LinkedinIcon, label: "LinkedIn", href: "#" },
];

/* ── Data ──────────────────────────────────────────────────────────── */

const solutionGroups: SolutionGroup[] = [
  {
    category: "Construction Management Software",
    items: [
      {
        num: "01",
        name: "HALA Build",
        href: "https://halasoftware.com/solutions#build",
      },
      {
        num: "02",
        name: "HALA BuildField",
        href: "https://halasoftware.com/solutions#buildfield",
      },
      {
        num: "03",
        name: "HALA Shop",
        href: "https://halasoftware.com/solutions#buildfield",
      },
    ],
  },
  {
    category: "Agriculture Management Software",
    items: [
      {
        num: "04",
        name: "HALA VetTrack",
        href: "https://halasoftware.com/solutions#vettrack",
      },
    ],
  },
  {
    category: "Health Management Software",
    items: [
      {
        num: "05",
        name: "HALA MedTrack",
        href: "https://halasoftware.com/solutions#medtrack",
      },
    ],
  },
  {
    category: "Education Management Software",
    items: [
      {
        num: "06",
        name: "HALA SkillDesk",
        href: "https://halasoftware.com/solutions#skilldesk",
      },
    ],
  },
  {
    category: "Business Management Software",
    items: [
      {
        num: "07",
        name: "HALA Collect",
        href: "https://halasoftware.com/solutions#collect",
      },
      {
        num: "08",
        name: "HALA TaxDesk",
        href: "https://halasoftware.com/solutions#collect",
      },
    ],
  },
  {
    category: "Consultancy Services",
    items: [
      {
        num: "09",
        name: "HALA Consultancy Services",
        href: "https://halasoftware.com/services",
      },
      {
        num: "10",
        name: "Hands-On Training",
        href: "https://halasoftware.com/training",
      },
    ],
  },
];

const testimonials: Testimonial[] = [
  {
    quote:
      "HALA Build has helped me understand how built-up rates are developed using real market prices.",
    name: "Student",
    role: "Civil Engineer",
    location: "Mbeya",
  },
  {
    quote:
      "HALA Collect has given me hands-on experience in rent collection and payment tracking.",
    name: "Student",
    role: "Business Administration Student",
    location: "Mbeya",
  },
  {
    quote:
      "HALA Build has reduced our quantity take-off time from PDF drawings by nearly 70%.",
    name: "Contractor",
    role: "Building Contractor",
    location: "Mbeya",
  },
  {
    quote:
      "With HALA BuildField, everyone gets project updates instantly. Coordination between the consultant, contractor, and client is much faster than before.",
    name: "Contractor",
    role: "Building Contractor",
    location: "Dodoma",
  },
];

const footerColumns: FooterColumn[] = [
  {
    title: "Products",
    links: [
      { label: "HALA Build", href: "https://halasoftware.com/solutions#build" },
      {
        label: "HALA BuildField",
        href: "https://halasoftware.com/solutions#buildfield",
      },
      {
        label: "HALA VetTrack",
        href: "https://halasoftware.com/solutions#vettrack",
      },
      {
        label: "HALA MedTrack",
        href: "https://halasoftware.com/solutions#medtrack",
      },
      {
        label: "HALA SkillDesk",
        href: "https://halasoftware.com/solutions#skilldesk",
      },
      {
        label: "HALA Collect",
        href: "https://halasoftware.com/solutions#collect",
      },
      {
        label: "HALA TaxDesk",
        href: "https://halasoftware.com/solutions#taxdesk",
      },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "https://halasoftware.com/about" },
      { label: "Consultancy", href: "https://halasoftware.com/services" },
      { label: "Training", href: "https://halasoftware.com/training" },
      { label: "News & Insights", href: "https://halasoftware.com/news" },
      { label: "Contact", href: "https://halasoftware.com/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      {
        label: "Downloads",
        href: "https://halasoftware.com/solutions#downloads",
      },
      { label: "Documentation", href: "https://halasoftware.com/" },
      { label: "Support Center", href: "https://halasoftware.com/" },
      { label: "FAQs", href: "https://halasoftware.com/" },
      {
        label: "Case Studies",
        href: "https://halasoftware.com/news#case-studies",
      },
    ],
  },
  {
    title: "Legal",
    links: [
      {
        label: "Terms of Service",
        href: "https://halasoftware.com/terms-of-services",
      },
      {
        label: "Privacy Policy",
        href: "https://halasoftware.com/privacy-policy",
      },
      {
        label: "Cookie Policy",
        href: "https://halasoftware.com/cookie-policy",
      },
      { label: "Licenses", href: "https://halasoftware.com/licences" },
    ],
  },
];

const navLinks: NavLink[] = [
  { label: "Home", href: "https://halasoftware.com/" },
  { label: "About", href: "https://halasoftware.com/about" },
];

const heroStats: Stat[] = [
  { value: "1400+", label: "Active Users" },
  { value: "9+", label: "Solutions" },
  { value: "24/7", label: "Support" },
];

const whyChoosePoints: string[] = [
  "Industry-specific solutions",
  "Innovative software development",
  "Hands-on training for maximum adoption",
  "Expert consultancy support",
];

/* ── Page ──────────────────────────────────────────────────────────── */

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [solutionsOpen, setSolutionsOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme>("light");

  // Initialise theme from storage or system preference.
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initial: Theme = stored ?? (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("theme", next);
      return next;
    });
  };

  const primaryBtn =
    "rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200";
  const outlineBtn =
    "rounded-lg border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900";

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a
            href="https://halasoftware.com/"
            className="flex items-center gap-2"
          >
            <span className="text-[15px] font-bold tracking-tight text-neutral-900 dark:text-white">
              HALA{" "}
              <span className="text-neutral-400 dark:text-neutral-500">
                Software
              </span>
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-8 text-sm">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                {l.label}
              </a>
            ))}

            <div
              className="relative"
              onMouseEnter={() => setSolutionsOpen(true)}
              onMouseLeave={() => setSolutionsOpen(false)}
            >
              <button className="flex items-center gap-1 text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                Solutions
                <ChevronDown
                  size={14}
                  className={`transition-transform ${solutionsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {solutionsOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-56">
                  <div className="rounded-xl border border-neutral-200 bg-white py-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
                    <a
                      href="https://halasoftware.com/services"
                      className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    >
                      Consultancy
                    </a>
                    <a
                      href="https://halasoftware.com/training"
                      className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    >
                      Training
                    </a>
                  </div>
                </div>
              )}
            </div>

            <a
              href="https://halasoftware.com/news"
              className="text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              News
            </a>
            <a
              href="https://halasoftware.com/contact"
              className="text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <a
              href="/home"
              className="hidden lg:inline-flex items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Get Started
            </a>

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-900 dark:border-neutral-800 dark:text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-neutral-200 bg-white px-6 py-4 flex flex-col gap-1 dark:border-neutral-800 dark:bg-neutral-950">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <a
              href="https://halasoftware.com/services"
              className="py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              Consultancy
            </a>
            <a
              href="https://halasoftware.com/training"
              className="py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              Training
            </a>
            <a
              href="https://halasoftware.com/news"
              className="py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              News
            </a>
            <a
              href="https://halasoftware.com/contact"
              className="py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              Contact
            </a>
            <a
              href="https://halasoftware.com/contact"
              className="mt-2 inline-flex justify-center items-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900"
            >
              Get Started
            </a>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Blueprint grid signature texture — currentColor adapts to theme */}
        <div
          className="absolute inset-0 pointer-events-none text-neutral-900 opacity-[0.05] dark:text-white"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-neutral-400/10 blur-3xl pointer-events-none dark:bg-neutral-500/10" />

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-neutral-500 mb-5">
            HALA Software
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-neutral-900 leading-[1.1] dark:text-white">
            Smart Digital Solutions
            <br />
            <span className="text-neutral-400 dark:text-neutral-500">
              for Modern Industries
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed dark:text-neutral-400">
            A technology company delivering intelligent software, hands-on
            training, and consultancy services to help construction firms,
            healthcare providers, educational institutions, agricultural
            enterprises, and businesses operate efficiently, accurately, and
            digitally.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="https://halasoftware.com/solutions" className={primaryBtn}>
              Download Our Software
            </a>
            <a href="https://halasoftware.com/training" className={outlineBtn}>
              View &amp; Enroll in Training
            </a>
            <a href="https://halasoftware.com/services" className={outlineBtn}>
              Request Consultancy
            </a>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-neutral-500 mt-1 uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solutions ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-2xl mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
            Complete Software Solutions, Consultancy &amp; Hands-on Training
          </h2>
          <p className="mt-3 text-neutral-600 text-sm sm:text-base leading-relaxed dark:text-neutral-400">
            Our ecosystem combines advanced software tools, expert consultancy
            and hands-on training to deliver measurable results.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {solutionGroups.map((group) => (
            <div key={group.category}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
                {group.category}
              </h3>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-baseline gap-3 rounded-lg px-3 py-2.5 -mx-3 transition hover:bg-neutral-100 group dark:hover:bg-neutral-900"
                  >
                    <span className="text-[11px] font-mono text-neutral-400 transition group-hover:text-neutral-900 dark:group-hover:text-white">
                      {item.num}
                    </span>
                    <span className="text-sm font-medium text-neutral-700 transition group-hover:text-neutral-900 dark:text-neutral-300 dark:group-hover:text-white">
                      {item.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Choose HALA ─────────────────────────────────────── */}
      <section className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
            Why Choose HALA?
          </h2>
          <p className="mt-3 text-neutral-600 text-sm sm:text-base max-w-xl mx-auto dark:text-neutral-400">
            Professional consultancy and training services designed to enhance
            your construction project success
          </p>

          <div className="mt-10 grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
            {whyChoosePoints.map((point) => (
              <div
                key={point}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-950"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 flex-shrink-0 dark:bg-white" />
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {point}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-neutral-200 dark:border-neutral-800">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
            What Our Clients Say
          </h2>
          <p className="mt-3 text-neutral-600 text-sm sm:text-base dark:text-neutral-400">
            Trusted by construction professionals across Tanzania
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col dark:border-neutral-800 dark:bg-neutral-900"
            >
              <p className="text-sm text-neutral-700 leading-relaxed flex-1 dark:text-neutral-300">
                "{t.quote}"
              </p>
              <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {t.name}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t.role} · {t.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────────── */}
      <section className="border-t border-neutral-200 bg-gradient-to-b from-neutral-50 to-white dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-950">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
            Build Smarter with HALA
          </h2>
          <p className="mt-4 text-neutral-600 text-sm sm:text-base leading-relaxed dark:text-neutral-400">
            Access HALA's intelligent software, professional short training
            courses, and expert consultancy services. Grow your organisation
            through powerful digital tools, practical skills development, and
            expert consultancy support.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="https://halasoftware.com/solutions" className={primaryBtn}>
              Download Our Software
            </a>
            <a href="https://halasoftware.com/training" className={outlineBtn}>
              View &amp; Enroll in Training
            </a>
            <a href="https://halasoftware.com/services" className={outlineBtn}>
              Request Consultancy
            </a>
          </div>

          <p className="mt-6 text-xs text-neutral-500">
            Free Trial Available · No Credit Card Required
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-6 gap-10">
            <div className="lg:col-span-2">
              <span className="text-[15px] font-bold tracking-tight text-neutral-900 dark:text-white">
                HALA{" "}
                <span className="text-neutral-400 dark:text-neutral-500">
                  Software
                </span>
              </span>
              <p className="mt-4 text-sm text-neutral-600 leading-relaxed max-w-xs dark:text-neutral-400">
                Integrated digital solutions for construction, agriculture,
                health, education, and business sectors.
              </p>

              <div className="mt-5 flex flex-col gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
                <a
                  href="https://halasoftware.com/#location"
                  className="flex items-center gap-2 transition hover:text-neutral-900 dark:hover:text-white"
                >
                  <MapPin
                    size={15}
                    className="flex-shrink-0 text-neutral-500"
                  />
                  Mbeya City, JB Street, Tanzania
                </a>
                <a
                  href="mailto:info@halasoftware.com"
                  className="flex items-center gap-2 transition hover:text-neutral-900 dark:hover:text-white"
                >
                  <Mail size={15} className="flex-shrink-0 text-neutral-500" />
                  info@halasoftware.com
                </a>
                <a
                  href="tel:+255713565874"
                  className="flex items-center gap-2 transition hover:text-neutral-900 dark:hover:text-white"
                >
                  <Phone size={15} className="flex-shrink-0 text-neutral-500" />
                  +255 713 565 874
                </a>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
                  Follow Us
                </p>
                <div className="flex items-center gap-2">
                  {socialLinks.map(({ Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:text-neutral-900 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-white dark:hover:border-neutral-600"
                    >
                      <Icon size={14} />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {footerColumns.map((col) => (
              <div key={col.title} className="lg:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-4">
                  {col.title}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 pt-8 border-t border-neutral-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between dark:border-neutral-800">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                Stay Updated
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Subscribe to our newsletter for the latest updates
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex w-full sm:w-auto gap-2"
            >
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 sm:w-64 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:ring-white/20"
              />
              <button
                type="submit"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 flex-shrink-0 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                Subscribe
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 dark:border-neutral-800">
            <p>© 2019 - 2026 HALA Software. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a
                href="https://halasoftware.com/terms-of-services"
                className="transition hover:text-neutral-900 dark:hover:text-white"
              >
                Terms
              </a>
              <a
                href="https://halasoftware.com/privacy-policy"
                className="transition hover:text-neutral-900 dark:hover:text-white"
              >
                Privacy
              </a>
              <a
                href="https://halasoftware.com/cookie-policy"
                className="transition hover:text-neutral-900 dark:hover:text-white"
              >
                Cookies
              </a>
              <a
                href="https://halasoftware.com/licences"
                className="transition hover:text-neutral-900 dark:hover:text-white"
              >
                Licences
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
