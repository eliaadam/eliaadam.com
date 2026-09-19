// src/pages/home.tsx

import { CtaSection } from "./marketing/cta-section";
import { DevelopersSection } from "./marketing/developers-section";
import { FaqSection } from "./marketing/faq-section";
import { HeroSection } from "./marketing/hero-section";
import { InfrastructureSection } from "./marketing/infrastructure-section";
import { NetworkSection } from "./marketing/network-section";
import { SecuritySection } from "./marketing/security-section";
import { SiteFooter } from "./marketing/site-footer";
import { SiteHeader } from "./marketing/site-header";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <HeroSection />
      <InfrastructureSection />
      <DevelopersSection />
      <NetworkSection />
      <SecuritySection />
      <CtaSection />
      <FaqSection />
      <SiteFooter />
    </main>
  );
}
