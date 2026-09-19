// src/components/marketing/cta-section.tsx
import { ArrowRight } from "lucide-react";
import { Button } from "../../../components/ui/button";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,87,184,0.12),transparent_45%)]" />

      <div className="ds-container relative">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Ready to{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              evolve
            </span>
            ?
          </h2>

          <p className="mt-5 text-base leading-7 text-muted-foreground">
            Jiunge na mfumo wa malipo wenye kasi na miundombinu iliyojengwa kwa
            biashara zinazotaka kukua.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <a href="/register">
                Initialize Merchant ID
                <ArrowRight />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="/docs">Read the documentation</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
