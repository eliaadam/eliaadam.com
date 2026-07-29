import { Link } from "react-router-dom";
import { useState } from "react";

const solutionGroups = [
  {
    category: "Construction Management Software",
    items: [
      { n: "01", name: "HALA Build", href: "/solutions#build" },
      { n: "02", name: "HALA BuildField", href: "/solutions#buildfield" },
      { n: "03", name: "HALA Shop", href: "/solutions#buildfield" },
    ],
  },
  {
    category: "Agriculture Management Software",
    items: [{ n: "04", name: "HALA VetTrack", href: "/solutions#vettrack" }],
  },
  {
    category: "Health Management Software",
    items: [{ n: "05", name: "HALA MedTrack", href: "/solutions#medtrack" }],
  },
  {
    category: "Education Management Software",
    items: [{ n: "06", name: "HALA SkillDesk", href: "/solutions#skilldesk" }],
  },
  {
    category: "Business Management Software",
    items: [
      { n: "07", name: "HALA Collect", href: "/solutions#collect" },
      { n: "08", name: "HALA TaxDesk", href: "/solutions#collect" },
    ],
  },
  {
    category: "Consultancy Services",
    items: [
      { n: "09", name: "HALA Consultancy Services", href: "/services" },
      { n: "10", name: "Hands-On Training", href: "/training" },
    ],
  },
];

const whyChoose = [
  {
    title: "Industry-specific solutions",
    desc: "Built around how construction, health, education, and agriculture teams actually work.",
  },
  {
    title: "Innovative software development",
    desc: "Modern tools engineered for accuracy and everyday reliability.",
  },
  {
    title: "Hands-on training for maximum adoption",
    desc: "Teams learn by doing, not by reading a manual.",
  },
  {
    title: "Expert consultancy support",
    desc: "Direct access to specialists who know your sector.",
  },
];

const testimonials = [
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

const footerColumns = [
  {
    title: "Products",
    links: [
      { label: "HALA Build", href: "/solutions#build" },
      { label: "HALA BuildField", href: "/solutions#buildfield" },
      { label: "HALA VetTrack", href: "/solutions#vettrack" },
      { label: "HALA MedTrack", href: "/solutions#medtrack" },
      { label: "HALA SkillDesk", href: "/solutions#skilldesk" },
      { label: "HALA Collect", href: "/solutions#collect" },
      { label: "HALA TaxDesk", href: "/solutions#taxdesk" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Consultancy", href: "/services" },
      { label: "Training", href: "/training" },
      { label: "News & Insights", href: "/news" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Downloads", href: "/solutions#downloads" },
      { label: "Documentation", href: "/" },
      { label: "Support Center", href: "/" },
      { label: "FAQs", href: "/" },
      { label: "Case Studies", href: "/news#case-studies" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms-of-services" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Cookie Policy", href: "/cookie-policy" },
      { label: "Licenses", href: "/licences" },
    ],
  },
];

export default function LandingPage() {
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-black/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="text-base font-black tracking-tight no-underline text-black dark:text-white"
          >
            HALA Software
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            <Link
              to="/"
              className="text-sm font-medium text-black dark:text-white hover:opacity-60 transition"
            >
              Home
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
            >
              About
            </Link>
            <div
              className="relative"
              onMouseEnter={() => setSolutionsOpen(true)}
              onMouseLeave={() => setSolutionsOpen(false)}
            >
              <button className="flex items-center gap-1 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition">
                Solutions
                <span className="text-[10px] mt-px">▾</span>
              </button>
              {solutionsOpen && (
                <div className="absolute top-full left-0 pt-3 w-48">
                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg overflow-hidden">
                    <Link
                      to="/services"
                      className="block px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-black dark:hover:text-white transition"
                    >
                      Consultancy
                    </Link>
                    <Link
                      to="/training"
                      className="block px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-black dark:hover:text-white transition border-t border-neutral-100 dark:border-neutral-800"
                    >
                      Training
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <Link
              to="/news"
              className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
            >
              News
            </Link>
            <Link
              to="/contact"
              className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
            >
              Contact
            </Link>
          </nav>

          <div className="hidden lg:block">
            <Link
              to="/home"
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition no-underline"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 text-black dark:text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileOpen && (
          <nav className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 px-4 py-4 flex flex-col gap-1 bg-white dark:bg-black">
            {[
              { label: "Home", href: "/" },
              { label: "About", href: "/about" },
              { label: "Consultancy", href: "/services" },
              { label: "Training", href: "/training" },
              { label: "News", href: "/news" },
              { label: "Contact", href: "/contact" },
            ].map((item) => (
              <Link
                key={item.href + item.label}
                to={item.href}
                className="px-2 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/home"
              className="mt-2 inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-full bg-black text-white dark:bg-white dark:text-black no-underline"
            >
              Get Started
            </Link>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16 sm:pb-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400 mb-4">
            HALA Software
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-6">
            Smart Digital Solutions
            <br />
            <span className="text-neutral-400 dark:text-neutral-600">
              for Modern Industries
            </span>
          </h1>
          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed mb-8 max-w-2xl">
            A technology company delivering intelligent software, hands-on
            training, and consultancy services to help construction firms,
            healthcare providers, educational institutions, agricultural
            enterprises, and businesses. We enable them to operate efficiently,
            accurately, and digitally.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/solutions"
              className="inline-flex items-center px-6 py-3 text-sm font-semibold rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition no-underline"
            >
              Download Our Software
            </Link>
            <Link
              to="/training"
              className="inline-flex items-center px-6 py-3 text-sm font-semibold rounded-full border border-neutral-300 dark:border-neutral-700 text-black dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition no-underline"
            >
              View & Enroll in Training
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center px-6 py-3 text-sm font-semibold rounded-full border border-neutral-300 dark:border-neutral-700 text-black dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition no-underline"
            >
              Request Consultancy
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 sm:mt-20 grid grid-cols-3 gap-4 sm:gap-8 border-t border-neutral-200 dark:border-neutral-800 pt-8">
          {[
            { value: "1400+", label: "Active Users" },
            { value: "9+", label: "Solutions" },
            { value: "24/7", label: "Support" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl sm:text-4xl font-black tracking-tight text-black dark:text-white m-0">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Solutions ledger */}
      <section className="bg-neutral-50 dark:bg-neutral-950 border-y border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-4">
              Complete Software Solutions, Consultancy & Hands-on Training
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Our ecosystem combines advanced software tools, expert consultancy
              and hands-on training to deliver measurable results.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-x-12">
            {solutionGroups.map((group) => (
              <div key={group.category} className="mb-10">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400 dark:text-neutral-600 mb-3">
                  {group.category}
                </p>
                <div className="flex flex-col">
                  {group.items.map((item) => (
                    <Link
                      key={item.n}
                      to={item.href}
                      className="group flex items-center gap-4 py-3 border-b border-neutral-200 dark:border-neutral-800 no-underline hover:pl-2 transition-all"
                    >
                      <span className="font-mono text-sm text-neutral-400 dark:text-neutral-600 w-6 flex-shrink-0">
                        {item.n}
                      </span>
                      <span className="text-sm sm:text-base font-medium text-black dark:text-white flex-1">
                        {item.name}
                      </span>
                      <span className="text-neutral-300 dark:text-neutral-700 group-hover:text-black dark:group-hover:text-white transition">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-2xl mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-4">
            Why Choose HALA?
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Professional consultancy and training services designed to enhance
            your construction project success.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {whyChoose.map((item, i) => (
            <div
              key={item.title}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 hover:border-black dark:hover:border-white transition"
            >
              <p className="font-mono text-xs text-neutral-400 dark:text-neutral-600 mb-4">
                {String(i + 1).padStart(2, "0")}
              </p>
              <p className="text-sm font-semibold text-black dark:text-white mb-2">
                {item.title}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-neutral-50 dark:bg-neutral-950 border-y border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-4">
              What Our Clients Say
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Trusted by construction professionals across Tanzania.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {testimonials.map((t) => (
              <div
                key={t.quote}
                className="rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col"
              >
                <p className="text-2xl text-neutral-300 dark:text-neutral-700 font-serif leading-none mb-2">
                  "
                </p>
                <p className="text-sm sm:text-base text-black dark:text-white leading-relaxed mb-6">
                  {t.quote}
                </p>
                <div className="mt-auto flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-black dark:text-white m-0">
                      {t.role}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0">
                      {t.name} · {t.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black dark:bg-white text-white dark:text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-4">
            Build Smarter with HALA
          </h2>
          <p className="text-neutral-300 dark:text-neutral-600 leading-relaxed max-w-2xl mx-auto mb-8">
            Access HALA's intelligent software, professional short training
            courses, and expert consultancy services. Grow your organisation
            through powerful digital tools, practical skills development, and
            expert consultancy support.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <Link
              to="/solutions"
              className="inline-flex items-center px-6 py-3 text-sm font-semibold rounded-full bg-white text-black dark:bg-black dark:text-white hover:opacity-90 transition no-underline"
            >
              Download Our Software
            </Link>
            <Link
              to="/training"
              className="inline-flex items-center px-6 py-3 text-sm font-semibold rounded-full border border-neutral-600 dark:border-neutral-400 text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100 transition no-underline"
            >
              View & Enroll in Training
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center px-6 py-3 text-sm font-semibold rounded-full border border-neutral-600 dark:border-neutral-400 text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100 transition no-underline"
            >
              Request Consultancy
            </Link>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
            Free Trial Available • No Credit Card Required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8">
            <div className="sm:col-span-2 lg:col-span-2">
              <p className="text-base font-black tracking-tight text-black dark:text-white mb-3">
                HALA Software
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-5 max-w-xs">
                Integrated digital solutions for construction, agriculture,
                health, education, and business sectors.
              </p>
              <div className="flex flex-col gap-2 text-sm">
                <a
                  href="https://halasoftware.com/#location"
                  className="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition no-underline"
                >
                  Mbeya City, JB Street, Tanzania
                </a>
                <a
                  href="mailto:info@halasoftware.com"
                  className="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition no-underline"
                >
                  info@halasoftware.com
                </a>
                <a
                  href="tel:+255713565874"
                  className="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition no-underline"
                >
                  +255 713 565 874
                </a>
              </div>
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600 mb-3">
                  Follow Us
                </p>
                <div className="flex gap-2">
                  {["𝕏", "in", "f"].map((icon) => (
                    <span
                      key={icon}
                      className="w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400"
                    >
                      {icon}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {footerColumns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600 mb-4">
                  {col.title}
                </p>
                <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition no-underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div className="mt-14 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-black dark:text-white m-0">
                Stay Updated
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 m-0 mt-0.5">
                Subscribe to our newsletter for the latest updates
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex w-full sm:w-auto gap-2"
            >
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 sm:w-64 px-4 py-2.5 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition flex-shrink-0"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0">
              © 2019 - 2026 HALA Software. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-5">
              <Link
                to="/terms-of-services"
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition no-underline"
              >
                Terms
              </Link>
              <Link
                to="/privacy-policy"
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition no-underline"
              >
                Privacy
              </Link>
              <Link
                to="/cookie-policy"
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition no-underline"
              >
                Cookies
              </Link>
              <Link
                to="/licences"
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition no-underline"
              >
                Licences
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
