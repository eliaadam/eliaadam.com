// components/sections/Philosophy.tsx
import { SectionIntro } from "./SectionIntro";

export function Philosophy() {
  const questions = [
    {
      q: "Can we make it simpler?",
      a: "We remove steps, screens, and jargon until only what's useful remains.",
    },
    {
      q: "Can we make it more secure?",
      a: "We design protection in from the start, not as a feature bolted on later.",
    },
    {
      q: "Can we make it better?",
      a: "We treat every release as a chance to improve on what came before.",
    },
  ];

  return (
    <section className="border-t border-[#D0D7DE] py-20 dark:border-[#30363D]">
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro
          title="Technology should work for people"
          description="We don't build because something can be built. We build because there is a problem worth solving."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {questions.map((item) => (
            <div
              key={item.q}
              className="group relative overflow-hidden rounded-lg border border-[#D0D7DE] bg-white p-6 dark:border-[#30363D] dark:bg-[#0D1117]"
            >
              <p className="font-[Space_Grotesk,sans-serif] text-lg font-medium text-[#1F2328] transition-opacity duration-300 group-hover:opacity-0 dark:text-[#E6EDF3]">
                {item.q}
              </p>
              <p className="absolute inset-0 flex translate-y-2 items-center bg-white p-6 text-sm leading-relaxed text-[#59636E] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 dark:bg-[#0D1117] dark:text-[#8B949E]">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
