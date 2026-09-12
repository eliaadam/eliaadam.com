// components/sections/ClosingCta.tsx
import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";

export function ClosingCta() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  return (
    <section
      id="contact"
      ref={ref}
      onMouseMove={onMouseMove}
      className="relative overflow-hidden border-t border-[#D0D7DE] bg-[#1F2328] py-24 dark:border-[#30363D] dark:bg-[#010409]"
    >
      <div
        className="pointer-events-none absolute h-72 w-72 rounded-full opacity-25 blur-3xl transition-all duration-300"
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, #4493F8 0%, #A371F7 45%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-[Space_Grotesk,sans-serif] text-3xl font-medium tracking-tight text-white sm:text-4xl">
          Build with MaishaSoft
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#8B949E]">
          Whether you&apos;re looking for a digital product, a business
          solution, a technology partnership, or a better way to serve your
          customers — let&apos;s build something better.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/signup"
            className="rounded-md bg-white px-4 py-2 text-sm text-[#1F2328] transition-colors hover:bg-[#E6EDF3]"
          >
            Create an account
          </Link>
          <Link
            to="/signin"
            className="rounded-md border border-[#30363D] px-4 py-2 text-sm text-white transition-colors hover:border-white"
          >
            Sign in
          </Link>
          <a
            href="mailto:hello@maishasoft.com"
            className="rounded-md border border-[#30363D] px-4 py-2 text-sm text-white transition-colors hover:border-white"
          >
            Get in touch
          </a>
        </div>
      </div>
    </section>
  );
}
