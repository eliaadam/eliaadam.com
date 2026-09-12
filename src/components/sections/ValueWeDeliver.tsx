// components/sections/ValueWeDeliver.tsx
import { SectionIntro } from "./SectionIntro";

export function ValueWeDeliver() {
  const items = [
    {
      title: "Simplicity",
      body: "We remove unnecessary complexity from products, processes, and interactions so people can focus on what matters.",
      line: "Simple experiences. Simple operations. Simple technology.",
    },
    {
      title: "Security",
      body: "We build our products and services with security at their foundation, protecting the information and transactions our ecosystem depends on.",
      line: "Secure by design. Trusted by default.",
    },
    {
      title: "Better products and services",
      body: "We focus on quality, usability, reliability, and continuous improvement to create experiences that are useful today and better tomorrow.",
      line: "Built with purpose. Built to deliver value.",
    },
  ];

  return (
    <section className="border-t border-[#D0D7DE] bg-[#F6F8FA] py-20 dark:border-[#30363D] dark:bg-[#161B22]">
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro title="The value we deliver" />

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.title}>
              <h3 className="font-[Space_Grotesk,sans-serif] text-lg font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#59636E] dark:text-[#8B949E]">
                {item.body}
              </p>
              <p className="mt-4 text-sm italic text-[#1F2328] dark:text-[#E6EDF3]">
                {item.line}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
