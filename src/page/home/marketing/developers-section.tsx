// src/components/marketing/developers-section.tsx
import { Code2, ShieldCheck, Sparkles } from "lucide-react";
 
import { TerminalCard } from "./terminal-card";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";

export function DevelopersSection() {
  return (
    <section id="developers" className="border-y border-border bg-muted/30 py-24 lg:py-32">
      <div className="ds-container">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <Badge variant="secondary">
              <Sparkles />
              Sonic-Shell
            </Badge>

            <h2 className="font-display mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Built for engineers.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              SonicPesa is more than a payment gateway. It provides the building blocks required
              to integrate payments into modern digital products.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-5">
                  <Code2 className="size-5 text-brand-blue-500" />
                  <h3 className="mt-4 text-sm font-semibold">SDK Autonomy</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Pre-built modules for common application stacks and payment workflows.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <ShieldCheck className="size-5 text-brand-green-500" />
                  <h3 className="mt-4 text-sm font-semibold">Secure Vault</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Structured API credentials and security controls for production integrations.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <TerminalCard />
        </div>
      </div>
    </section>
  );
}