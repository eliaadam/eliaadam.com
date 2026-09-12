// components/SectionIntro.tsx

import { useReveal } from "../../lib/hooks/useReveal";

export function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={[
        "max-w-xl transition-all duration-700 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      ].join(" ")}
    >
      {eyebrow && (
        <p className="mb-2 text-sm text-[#59636E] dark:text-[#8B949E]">
          {eyebrow}
        </p>
      )}
      <h2 className="font-[Space_Grotesk,sans-serif] text-2xl font-medium tracking-tight text-[#1F2328] dark:text-[#E6EDF3] sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-[15px] leading-relaxed text-[#59636E] dark:text-[#8B949E]">
          {description}
        </p>
      )}
    </div>
  );
}
