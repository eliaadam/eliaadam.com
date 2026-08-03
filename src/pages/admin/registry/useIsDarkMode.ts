import { useEffect, useState } from "react";

/**
 * @uiw/react-md-editor themes itself via a `data-color-mode` attribute
 * rather than reading Tailwind's `dark:` classes, so it needs telling
 * separately. This watches <html class="dark"> — however the rest of the
 * app is toggling that class already — and re-renders when it flips.
 */
export function useIsDarkMode(): boolean {
  const [dark, setDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() =>
      setDark(el.classList.contains("dark")),
    );
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}
