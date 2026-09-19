// src/components/marketing/network-section.tsx
import { Check, ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { NETWORKS } from "../../../data/marketing";
import { Card, CardContent } from "../../../components/ui/card";

export function NetworkSection() {
  return (
    <section id="network" className="py-24 lg:py-32">
      <div className="ds-container">
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue-600 dark:text-brand-blue-400">
              Payment Network
            </div>

            <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              One connection.
              <br />
              Multiple payment rails.
            </h2>

            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Connect your application once and build payment experiences around
              a consistent infrastructure layer.
            </p>

            <Button className="mt-8" variant="outline" asChild>
              <a href="/docs">
                Explore the network
                <ChevronRight />
              </a>
            </Button>

            <img
              src="/images/undraw_local-server_9izb.svg"
              alt="Illustration of a local server rack"
              className="mt-10 hidden max-w-[280px] lg:block"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {NETWORKS.map((network) => (
              <Card key={network}>
                <CardContent className="flex items-center gap-3 p-5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                    <Check className="size-4 text-success" />
                  </span>
                  <span className="text-sm font-medium">{network}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
