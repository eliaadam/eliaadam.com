// components/sections/WhatWeDo.tsx
import { type Accent, accentBorder, accentText } from "../../lib/design-tokens";
import { IconDeliver, IconFind, IconTransact } from "./icons";
import { SectionIntro } from "./SectionIntro";
import { type ReactNode } from "react";

export function WhatWeDo() {
  const items: { key: Accent; icon: ReactNode; title: string; body: string }[] =
    [
      {
        key: "find",
        icon: <IconFind />,
        title: "Find",
        body: "Digital spaces that make it easy to discover products, services, opportunities, and resources — helping people find what they need, faster.",
      },
      {
        key: "transact",
        icon: <IconTransact />,
        title: "Transact",
        body: "Secure technology that makes transactions easier, safer, and more reliable — helping people and businesses transact with confidence.",
      },
      {
        key: "deliver",
        icon: <IconDeliver />,
        title: "Deliver",
        body: "Technology that connects transactions with fulfillment and logistics — helping products and services reach where they need to go.",
      },
    ];

  return (
    <section
      id="what-we-do"
      className="border-t border-[#D0D7DE] py-20 dark:border-[#30363D]"
    >
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro
          title="What we do"
          description="Three parts of the digital business experience, brought together as one connected circle."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.key}
              className={[
                "group rounded-lg border border-[#D0D7DE] bg-white p-6 transition-all duration-300 dark:border-[#30363D] dark:bg-[#0D1117]",
                "hover:-translate-y-1 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]",
                "border-t-2",
                accentBorder[item.key],
              ].join(" ")}
            >
              <span className={`inline-flex ${accentText[item.key]}`}>
                {item.icon}
              </span>
              <h3 className="mt-4 font-[Space_Grotesk,sans-serif] text-lg font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#59636E] dark:text-[#8B949E]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
