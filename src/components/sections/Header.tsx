// components/Header.tsx
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { IconMoon, IconSun } from "./icons";

export function Header({
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

  // In-page anchors for the marketing sections.
  const sectionLinks = [
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
        <Link
          to="/"
          className="font-[Space_Grotesk,sans-serif] text-lg font-medium tracking-tight text-[#1F2328] dark:text-[#E6EDF3]"
        >
          Maisha
          <span className="font-normal text-[#59636E] dark:text-[#8B949E]">
            Soft
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {sectionLinks.map((l) => (
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
            {isDark ? <IconSun /> : <IconMoon />}
          </button>

          {/* Auth links — desktop only, mirrored in the mobile menu below */}
          <NavLink
            to="/signin"
            className="hidden text-sm text-[#59636E] transition-colors hover:text-[#1F2328] dark:text-[#8B949E] dark:hover:text-[#E6EDF3] sm:inline-block"
          >
            Sign in
          </NavLink>
          <Link
            to="/signup"
            className="hidden rounded-md bg-[#1F2328] px-3.5 py-1.5 text-sm text-white transition-colors hover:bg-black dark:bg-[#E6EDF3] dark:text-[#0D1117] dark:hover:bg-white sm:inline-block"
          >
            Sign up
          </Link>

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
            {sectionLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm text-[#59636E] dark:text-[#8B949E]"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-[#D0D7DE] pt-4 dark:border-[#30363D]">
              <Link
                to="/signin"
                onClick={() => setMenuOpen(false)}
                className="text-sm text-[#59636E] dark:text-[#8B949E]"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                onClick={() => setMenuOpen(false)}
                className="rounded-md bg-[#1F2328] px-3.5 py-2 text-center text-sm text-white dark:bg-[#E6EDF3] dark:text-[#0D1117]"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
