export function Logo() {
  return (
    <a
      href="#"
      className="group inline-flex items-center gap-2.5"
      aria-label="SonicPesa home"
    >
      <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg bg-brand-gradient text-white shadow-sm">
        <img
          src="/images/mainlog.png"
          alt="Illustration of money transferring between two people"
          className="size-full max-w-[380px] object-contain"
          loading="eager"
          decoding="async"
        />
      </span>
      <span className="font-display text-base font-semibold tracking-tight text-foreground">
        SonicPesa
      </span>
    </a>
  );
}
