// src/components/marketing/feature-card.tsx

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import type { Feature } from "../../../data/marketing";
import { cn } from "../../../design-system/lib/utils";

export function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <Card className="group transition-all duration-normal hover:-translate-y-0.5 hover:shadow-lg">
      <CardHeader>
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl border",
            feature.tone === "green"
              ? "border-brand-green-500/20 bg-brand-green-500/10 text-brand-green-600 dark:text-brand-green-400"
              : "border-brand-blue-500/20 bg-brand-blue-500/10 text-brand-blue-600 dark:text-brand-blue-400",
          )}
        >
          <Icon className="size-5" />
        </div>
        <CardTitle className="mt-5 text-base">{feature.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">
          {feature.body}
        </p>
      </CardContent>
    </Card>
  );
}
