// components/sections/WhyMaishaSoft.tsx
import { useEffect, useRef, useState, Fragment } from "react";
import { type Accent, accentBg, accentBorder } from "../../lib/design-tokens";
import { SectionIntro } from "./SectionIntro";

export function WhyMaishaSoft() {
  const steps = [
    {
      key: "find" as Accent,
      label: "Find",
      body: "A person can find what they need.",
    },
    {
      key: "transact" as Accent,
      label: "Transact",
      body: "They can transact securely.",
    },
    {
      key: "deliver" as Accent,
      label: "Receive",
      body: "They can receive what they purchased.",
    },
  ];

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && active === -1) {
            steps.forEach((_, i) => {
              timers.push(setTimeout(() => setActive(i), i * 450));
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      id="why"
      ref={sectionRef}
      className="border-t border-[#D0D7DE] py-20 dark:border-[#30363D]"
    >
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro
          title="We connect the entire experience"
          description="Finding something, buying it, and getting it delivered shouldn't feel like three disconnected activities."
        />

        <div className="mt-14 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {steps.map((step, i) => (
            <Fragment key={step.key}>
              <div
                className={[
                  "flex-1 rounded-lg border p-5 transition-all duration-500",
                  active >= i
                    ? `${accentBorder[step.key]} bg-white dark:bg-[#0D1117]`
                    : "border-[#D0D7DE] bg-white opacity-40 dark:border-[#30363D] dark:bg-[#0D1117]",
                ].join(" ")}
              >
                <span
                  className={[
                    "mb-3 inline-block h-2 w-2 rounded-full transition-colors duration-500",
                    active >= i
                      ? accentBg[step.key]
                      : "bg-[#D0D7DE] dark:bg-[#30363D]",
                  ].join(" ")}
                />
                <h3 className="text-[15px] font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                  {step.label}
                </h3>
                <p className="mt-1 text-sm text-[#59636E] dark:text-[#8B949E]">
                  {step.body}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={[
                    "hidden h-px flex-none origin-left bg-[#D0D7DE] transition-transform duration-500 dark:bg-[#30363D] sm:block sm:w-8",
                    active > i ? "scale-x-100" : "scale-x-0",
                  ].join(" ")}
                />
              )}
            </Fragment>
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[#59636E] dark:text-[#8B949E]">
          Businesses participate in the same ecosystem to offer products,
          provide services, manage operations, and reach customers.
          Organizations collaborate with us to extend their capabilities and
          create new possibilities.
        </p>
      </div>
    </section>
  );
}
