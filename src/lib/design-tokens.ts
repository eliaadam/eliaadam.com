// lib/design-tokens.ts
export type Accent = "find" | "transact" | "deliver";

export const accentText: Record<Accent, string> = {
    find: "text-[#0969DA] dark:text-[#4493F8]",
    transact: "text-[#8250DF] dark:text-[#A371F7]",
    deliver: "text-[#1A7F37] dark:text-[#3FB950]",
};

export const accentBorder: Record<Accent, string> = {
    find: "border-[#0969DA] dark:border-[#4493F8]",
    transact: "border-[#8250DF] dark:border-[#A371F7]",
    deliver: "border-[#1A7F37] dark:border-[#3FB950]",
};

export const accentBg: Record<Accent, string> = {
    find: "bg-[#0969DA] dark:bg-[#4493F8]",
    transact: "bg-[#8250DF] dark:bg-[#A371F7]",
    deliver: "bg-[#1A7F37] dark:bg-[#3FB950]",
};