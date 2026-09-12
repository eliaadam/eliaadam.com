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

  const sectionLinks = [
    { label: "What we do", href: "#what-we-do" },
    { label: "What we provide", href: "#what-we-provide" },
    { label: "Why MaishaSoft", href: "#why" },
    { label: "Get in touch", href: "#contact" },
  ];

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
      <div
        className={[
          "mx-auto flex max-w-5xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-300 sm:px-5",
          scrolled
            ? "border border-[#D0D7DE] bg-white/90 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.25)] backdrop-blur-md dark:border-[#30363D] dark:bg-[#0D1117]/90"
            : "border border-transparent bg-white/60 backdrop-blur-sm dark:bg-[#0D1117]/60",
        ].join(" ")}
      >
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/images/mainlogo.png"
            alt="MaishaSoft logo"
            width={28}
            height={28}
            className="h-7 w-7 rounded-md object-contain"
          />
          <span className="font-[Space_Grotesk,sans-serif] text-base font-medium tracking-tight text-[#1F2328] dark:text-[#E6EDF3]">
            MaishaSoft
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full bg-[#F6F8FA] p-1 dark:bg-[#161B22] md:flex">
          {sectionLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-sm text-[#59636E] transition-colors hover:bg-white hover:text-[#1F2328] dark:text-[#8B949E] dark:hover:bg-[#0D1117] dark:hover:text-[#E6EDF3]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            aria-label="Toggle dark mode"
            className="grid h-8 w-8 place-items-center rounded-full text-[#59636E] transition-colors hover:bg-[#F6F8FA] hover:text-[#1F2328] dark:text-[#8B949E] dark:hover:bg-[#161B22] dark:hover:text-[#E6EDF3]"
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </button>

          <NavLink
            to="/signin"
            className="hidden rounded-full px-3.5 py-1.5 text-sm text-[#59636E] transition-colors hover:text-[#1F2328] dark:text-[#8B949E] dark:hover:text-[#E6EDF3] sm:inline-block"
          >
            Sign in
          </NavLink>
          <Link
            to="/signup"
            className="hidden rounded-full bg-[#1F2328] px-4 py-1.5 text-sm text-white transition-colors hover:bg-black dark:bg-[#E6EDF3] dark:text-[#0D1117] dark:hover:bg-white sm:inline-block"
          >
            Sign up
          </Link>

          <button
            className="grid h-8 w-8 place-items-center rounded-full text-[#59636E] dark:text-[#8B949E] md:hidden"
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
        <div className="mx-auto mt-2 max-w-5xl rounded-2xl border border-[#D0D7DE] bg-white px-5 py-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.25)] dark:border-[#30363D] dark:bg-[#0D1117] md:hidden">
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
                className="rounded-full bg-[#1F2328] px-3.5 py-2 text-center text-sm text-white dark:bg-[#E6EDF3] dark:text-[#0D1117]"
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
