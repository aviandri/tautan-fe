import { DM_Mono, Urbanist } from "next/font/google";

/** Kartu (owner-side design system) fonts. Applied with the `.kartu` scope class. */
const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-urbanist", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

export const kartuClass = `kartu ${urbanist.variable} ${dmMono.variable}`;
