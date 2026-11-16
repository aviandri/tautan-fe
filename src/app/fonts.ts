import { DM_Mono, Urbanist } from "next/font/google";

/**
 * Kartu fonts: Urbanist for UI and body, DM Mono for numbers and codes. Applied on <html> by the root
 * layout. preload:false because public pages render in their theme font and must not fetch these
 * eagerly (perf budget); a font file only downloads when text actually uses it.
 */
const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-urbanist", display: "swap", preload: false });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap", preload: false });

export const fontVariables = `${urbanist.variable} ${dmMono.variable}`;
