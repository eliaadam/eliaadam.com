// src/components/marketing/site-footer.tsx
import { Separator } from "@radix-ui/react-dropdown-menu";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="ds-container">
        <div className="grid gap-12 py-14 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
              Engineered for payment performance. Built for modern African commerce.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              Systems operational
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">Platform</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li><a className="hover:text-foreground" href="#infrastructure">Infrastructure</a></li>
              <li><a className="hover:text-foreground" href="#developers">Developers</a></li>
              <li><a className="hover:text-foreground" href="#network">Network</a></li>
              <li><a className="hover:text-foreground" href="#security">Security</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">Resources</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li><a className="hover:text-foreground" href="/docs">Documentation</a></li>
              <li><a className="hover:text-foreground" href="/dashboard">Control Panel</a></li>
              <li><a className="hover:text-foreground" href="/terms">Terms</a></li>
              <li><a className="hover:text-foreground" href="/privacy">Privacy</a></li>
            </ul>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 SonicPesa Infrastructure.</span>
          <span className="font-mono">DISTRIBUTED_FINANCIAL_OPERATING_SYSTEM</span>
        </div>
      </div>
    </footer>
  );
}