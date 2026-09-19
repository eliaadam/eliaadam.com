// src/components/marketing/infrastructure-section.tsx
import { FEATURES } from "../../../data/marketing";
import { FeatureCard } from "./feature-card";

export function InfrastructureSection() {
  return (
    <section id="infrastructure" className="py-24 lg:py-32">
      <div className="ds-container">
        <div className="mb-12 max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green-600 dark:text-brand-green-400">
            Autonomous Systems
          </div>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Core infrastructure
          </h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            Everything needed to accept, process, monitor and settle digital
            payments from one infrastructure layer.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
