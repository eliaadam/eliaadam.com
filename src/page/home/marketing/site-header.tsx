// src/components/marketing/site-header.tsx
import { useState } from "react";
import { ArrowRight, Menu } from "lucide-react";

import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NAV_LINKS } from "../../../data/marketing";
import { Button } from "../../../components/ui/button";

interface MarketingNavLink {
  label: string;
  href: string;
}

export function SiteHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="ds-container">
          <div className="flex h-16 items-center justify-between">
            <Logo />

            <nav className="hidden items-center gap-7 md:flex">
              {NAV_LINKS.map((link: MarketingNavLink) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:block">
              <Button size="sm" asChild>
                <a href="/signup">
                  Get Started
                  <ArrowRight />
                </a>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu />
            </Button>
          </div>
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
