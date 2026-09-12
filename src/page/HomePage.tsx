// pages/HomePage.tsx
import { useEffect, useState } from "react";

import { Hero } from "../components/sections/Hero";
import { WhatWeDo } from "../components/sections/WhatWeDo";
import { WhatWeProvide } from "../components/sections/WhatWeProvide";
import { ValueWeDeliver } from "../components/sections/ValueWeDeliver";
import { WhyMaishaSoft } from "../components/sections/WhyMaishaSoft";
import { BuiltForEveryone } from "../components/sections/BuiltForEveryone";
import { Philosophy } from "../components/sections/Philosophy";
import { ClosingCta } from "../components/sections/ClosingCta";
import { Header } from "../components/sections/Header";
import { Footer } from "../components/sections/Footer";

export default function HomePage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <div className="min-h-screen bg-white text-[#1F2328] antialiased dark:bg-[#0D1117] dark:text-[#E6EDF3]">
      <Header isDark={isDark} onToggleTheme={() => setIsDark((v) => !v)} />
      <main>
        <Hero />
        <WhatWeDo />
        <WhatWeProvide />
        <ValueWeDeliver />
        <WhyMaishaSoft />
        <BuiltForEveryone />
        <Philosophy />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
