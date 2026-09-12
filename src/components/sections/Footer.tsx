// components/Footer.tsx
export function Footer() {
  return (
    <footer className="bg-[#1F2328] py-8 dark:bg-[#010409]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-[#8B949E] sm:flex-row">
        <span>
          © {new Date().getFullYear()} MaishaSoft. All rights reserved.
        </span>
        <span>Simple. Secure. Better.</span>
      </div>
    </footer>
  );
}
