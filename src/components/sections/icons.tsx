// components/icons.tsx
const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconFind = () => (
  <svg {...iconProps}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M20 20l-4.8-4.8" />
  </svg>
);

export const IconTransact = () => (
  <svg {...iconProps}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
);

export const IconDeliver = () => (
  <svg {...iconProps}>
    <path d="M3 8.5l9-5 9 5-9 5-9-5z" />
    <path d="M3 8.5V16l9 5 9-5V8.5" />
    <path d="M12 13.5V21" />
  </svg>
);

export const IconSaas = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);

export const IconPlatform = () => (
  <svg {...iconProps}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
);

export const IconServices = () => (
  <svg {...iconProps}>
    <path d="M14.7 3.3a4 4 0 00-5.4 5.4L3 15l3 3 6.3-6.3a4 4 0 005.4-5.4l-3.1 3.1-2-2 3.1-3.1z" />
  </svg>
);

export const IconPartnership = () => (
  <svg {...iconProps}>
    <circle cx="8" cy="8" r="3.2" />
    <circle cx="16" cy="16" r="3.2" />
    <path d="M10.3 10.3l3.4 3.4" />
  </svg>
);

export const IconIndividuals = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
  </svg>
);

export const IconBusinesses = () => (
  <svg {...iconProps}>
    <rect x="4" y="9" width="16" height="11" rx="1" />
    <path d="M9 9V6a3 3 0 016 0v3" />
  </svg>
);

export const IconOrganizations = () => (
  <svg {...iconProps}>
    <path d="M4 20V9l8-5 8 5v11" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

export const IconDevelopers = () => (
  <svg {...iconProps}>
    <path d="M8 8L3.5 12 8 16M16 8l4.5 4-4.5 4M13.5 6l-3 12" />
  </svg>
);

export const IconSun = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </svg>
);

export const IconMoon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
  </svg>
);
