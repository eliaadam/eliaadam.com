// src/components/marketing/security-section.tsx
import { ShieldCheck } from "lucide-react";
import { Badge } from "../../../components/ui/badge";

export function SecuritySection() {
  return (
    <section
      id="security"
      className="relative overflow-hidden border-y border-border py-24 lg:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(46,174,104,0.08),transparent_42%)]" />

      <div className="ds-container relative">
        <div className="mx-auto max-w-3xl text-center">
          <img
            src="/images/undraw_team-permissions_1lrk.svg"
            alt="Illustration of a team managing access permissions"
            className="mx-auto mb-8 max-w-[220px]"
            loading="lazy"
            decoding="async"
          />

          <Badge variant="outline">
            <ShieldCheck />
            Security-first infrastructure
          </Badge>

          <h2 className="font-display mt-6 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Designed to protect every transaction.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Security controls are integrated throughout the payment lifecycle,
            from credentials and APIs to transaction processing and settlement.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Badge variant="success">Encrypted</Badge>
            <Badge variant="info">Monitored</Badge>
            <Badge variant="secondary">Auditable</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
