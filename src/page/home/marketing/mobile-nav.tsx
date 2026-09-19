// src/components/marketing/mobile-nav.tsx
import { ArrowRight, X } from "lucide-react";

import { Logo } from "./logo";
import { NAV_LINKS } from "../../../data/marketing";
import { Button } from "../../../components/ui/button";

type MobileNavProps = { open: boolean; onClose: () => void };

export function MobileNav({ open, onClose }: MobileNavProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col border-l border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <nav className="mt-10 flex flex-col gap-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={onClose}
              className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="mt-auto">
          <Button className="w-full" asChild>
            <a href="/signup">
              Start Integration
              <ArrowRight />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
