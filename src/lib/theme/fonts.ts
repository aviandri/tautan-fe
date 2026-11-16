// next/font loaders for the curated list in fonts-meta.ts. preload:false so a page only
// downloads the face it actually uses; the @font-face rules are cheap.
import {
  Inter,
  DM_Sans,
  Manrope,
  Outfit,
  Space_Grotesk,
  Bricolage_Grotesque,
  Fraunces,
  Playfair_Display,
  Lora,
  JetBrains_Mono,
} from "next/font/google";

// next/font needs literal options on every call (no shared object or spread).
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-dm-sans" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-manrope" });
const outfit = Outfit({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-outfit" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-space-grotesk" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-bricolage" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-fraunces" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-playfair" });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-lora" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-jetbrains-mono" });

/** Put on any ancestor of a themed page so every theme font variable resolves. */
export const themeFontVariables = [
  inter, dmSans, manrope, outfit, spaceGrotesk, bricolage, fraunces, playfair, lora, jetbrainsMono,
]
  .map((f) => f.variable)
  .join(" ");
