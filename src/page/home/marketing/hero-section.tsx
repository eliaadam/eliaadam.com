// src/components/marketing/hero-section.tsx
import { ArrowRight, Check, Code2 } from "lucide-react";

import { Button } from "../../../components/ui/button";

import { HeroIllustration } from "./hero-illustration";
import { StatsBar } from "./stats-bar";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";

export function HeroSection() {
  return (
    <section id="get-started" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(0,87,184,0.14),transparent_30%),radial-gradient(circle_at_85%_65%,rgba(46,174,104,0.1),transparent_28%)]" />

      <div className="ds-container relative">
        <div className="grid items-center gap-14 py-20 md:grid-cols-2 md:py-28 lg:gap-20 lg:py-32">
          <div>
            <Badge
              variant="outline"
              className="border-brand-green-500/30 bg-brand-green-500/5 text-brand-green-600 dark:text-brand-green-400"
            >
              <span className="mr-1.5 size-1.5 rounded-full bg-brand-green-500" />
              Payment infrastructure for Africa
            </Badge>

            <h1 className="font-display mt-6 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              The high-speed{" "}
              <span className="bg-brand-gradient bg-clip-text text-transparent">
                payment
              </span>{" "}
              grid.
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Mfumo wa kisasa wa malipo kwa wafanyabiashara Afrika. Unganisha
              biashara yako, pokea malipo na panua huduma zako kwa miundombinu
              iliyojengwa kwa kasi na kiwango.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <a href="/signup">
                  Start Integration
                  <ArrowRight />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/docs">
                  <Code2 />
                  Documentation
                </a>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="size-3.5 text-success" />
                Developer-first API
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-3.5 text-success" />
                Mobile money ready
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-3.5 text-success" />
                Built for scale
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="absolute -inset-10 rounded-full bg-brand-blue-500/10 blur-3xl" />

            <Card className="relative overflow-hidden border-brand-blue-500/15 bg-surface/90 shadow-xl">
              <CardContent className="p-0">
                <div className="aspect-square p-7 sm:p-10">
                  <div className="relative flex size-full items-center justify-center rounded-2xl border border-border bg-background/60 text-foreground">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,87,184,0.09),transparent_55%)]" />

                    <HeroIllustration />

                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-lg border border-border bg-surface/90 px-4 py-3 text-xs backdrop-blur">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-brand-green-500" />
                        Instant settlement
                      </span>
                      <span className="font-mono text-[10px] text-foreground">
                        LIVE
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <StatsBar />
    </section>
  );
}
