// components/sections/WhatWeProvide.tsx
import { IconPartnership, IconPlatform, IconSaas, IconServices } from "./icons";
import { SectionIntro } from "./SectionIntro";

export function WhatWeProvide() {
  const items = [
    {
      icon: <IconSaas />,
      title: "SaaS products",
      body: "Software that businesses and organizations use to run, manage, and grow their operations — built to solve real problems without unnecessary complexity.",
    },
    {
      icon: <IconPlatform />,
      title: "Digital platforms",
      body: "Digital spaces where people and businesses discover, connect, exchange value, and access products and services.",
    },
    {
      icon: <IconServices />,
      title: "Services",
      body: "Technology-enabled services that extend beyond software, helping individuals and organizations accomplish more.",
    },
    {
      icon: <IconPartnership />,
      title: "Partnerships",
      body: "Collaboration with organizations to connect capabilities, integrate systems, and build solutions the whole ecosystem benefits from.",
    },
  ];

  return (
    <section
      id="what-we-provide"
      className="border-t border-[#D0D7DE] py-20 dark:border-[#30363D]"
    >
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro title="What we provide" />

        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[#D0D7DE] bg-[#D0D7DE] dark:border-[#30363D] dark:bg-[#30363D] sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.title}
              className="group bg-white p-6 transition-colors duration-300 hover:bg-[#F6F8FA] dark:bg-[#0D1117] dark:hover:bg-[#161B22]"
            >
              <span className="inline-flex text-[#1F2328] transition-transform duration-300 group-hover:-translate-y-0.5 dark:text-[#E6EDF3]">
                {item.icon}
              </span>
              <h3 className="mt-4 text-[15px] font-medium text-[#1F2328] dark:text-[#E6EDF3]">
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
