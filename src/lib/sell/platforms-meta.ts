/**
 * P3 platform metadata without brand marks: labels, hosts for detection, examples. Validators and
 * smart paste use this so the editor's first load doesn't carry simple-icons paths;
 * ./platforms adds the marks for renderers and forms.
 */
import type { COURIERS, MarketplacePlatform, TIP_PLATFORMS } from "../types";

export interface PlatformMeta {
  label: string;
  /** hostnames (and their subdomains) that belong to the platform */
  hosts: string[];
  /** example URL for placeholders */
  example: string;
}

export const MARKETPLACES: Record<MarketplacePlatform, PlatformMeta> = {
  shopee: { label: "Shopee", hosts: ["shopee.co.id", "shopee.com", "shopee.sg", "shopee.com.my", "shp.ee"], example: "https://shopee.co.id/yourshop" },
  tokopedia: { label: "Tokopedia", hosts: ["tokopedia.com", "tokopedia.link", "tkp.me"], example: "https://www.tokopedia.com/yourshop" },
  tiktok_shop: { label: "TikTok Shop", hosts: ["shop.tiktok.com", "vt.tokopedia.com"], example: "https://shop.tiktok.com/…" },
  lazada: { label: "Lazada", hosts: ["lazada.co.id", "lazada.com.my", "lazada.sg", "s.lazada.co.id"], example: "https://www.lazada.co.id/shop/yourshop" },
  blibli: { label: "Blibli", hosts: ["blibli.com"], example: "https://www.blibli.com/merchant/yourshop" },
  bukalapak: { label: "Bukalapak", hosts: ["bukalapak.com"], example: "https://www.bukalapak.com/u/yourshop" },
  etsy: { label: "Etsy", hosts: ["etsy.com", "etsy.me"], example: "https://www.etsy.com/shop/YourShop" },
  amazon: { label: "Amazon", hosts: ["amazon.com", "amazon.sg", "amazon.co.uk", "amzn.to", "amzn.asia"], example: "https://www.amazon.com/dp/…" },
  gumroad: { label: "Gumroad", hosts: ["gumroad.com", "gum.co"], example: "https://you.gumroad.com" },
};

export const TIPS: Record<(typeof TIP_PLATFORMS)[number], PlatformMeta> = {
  saweria: { label: "Saweria", hosts: ["saweria.co"], example: "https://saweria.co/you" },
  trakteer: { label: "Trakteer", hosts: ["trakteer.id"], example: "https://trakteer.id/you" },
  kofi: { label: "Ko-fi", hosts: ["ko-fi.com"], example: "https://ko-fi.com/you" },
  paypal: { label: "PayPal", hosts: ["paypal.me", "paypal.com"], example: "https://paypal.me/you" },
  buymeacoffee: { label: "Buy Me a Coffee", hosts: ["buymeacoffee.com"], example: "https://buymeacoffee.com/you" },
};

export const COURIER_LABELS: Record<(typeof COURIERS)[number], string> = {
  gosend: "GoSend",
  grabexpress: "GrabExpress",
  jne: "JNE",
  jnt: "J&T",
  sicepat: "SiCepat",
  anteraja: "AnterAja",
  pos: "Pos Indonesia",
  shopee_express: "SPX Express",
  lalamove: "Lalamove",
  paxel: "Paxel",
  pickup: "Pick up",
};

function hostOf(url: string): string | null {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matchHost<K extends string>(table: Record<K, PlatformMeta>, url: string): K | null {
  const h = hostOf(url);
  if (!h) return null;
  // longest host first, so shop.tiktok.com wins over a broader match
  const entries = (Object.entries(table) as [K, PlatformMeta][]).flatMap(([k, m]) => m.hosts.map((host) => [k, host] as const));
  entries.sort((a, b) => b[1].length - a[1].length);
  return entries.find(([, host]) => h === host || h.endsWith(`.${host}`))?.[0] ?? null;
}

export const detectMarketplace = (url: string) => matchHost(MARKETPLACES, url);
export const detectTipPlatform = (url: string) => matchHost(TIPS, url);

/**
 * Does a marketplace URL look like one product (vs a whole store)? Heuristic by path:
 * Shopee "…-i.<shop>.<item>" or "/product/<shop>/<item>", Tokopedia "/<shop>/<slug>",
 * TikTok Shop "/view/product/…", Lazada "/products/…", Etsy "/listing/…", Amazon "/dp/…".
 */
export function isProductUrl(platform: MarketplacePlatform, url: string): boolean {
  let path: string;
  try {
    path = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).pathname;
  } catch {
    return false;
  }
  const seg = path.split("/").filter(Boolean);
  switch (platform) {
    case "shopee":
      return /-i\.\d+\.\d+/.test(path) || (seg[0] === "product" && seg.length >= 3);
    case "tokopedia":
      return seg.length >= 2 && !["discovery", "search", "p", "promo"].includes(seg[0]);
    case "tiktok_shop":
      return /\/product\//.test(path);
    case "lazada":
      return seg[0] === "products";
    case "blibli":
      return seg[0] === "p";
    case "bukalapak":
      return seg[0] === "p";
    case "etsy":
      return seg[0] === "listing";
    case "amazon":
      return seg.includes("dp") || seg.includes("gp");
    case "gumroad":
      return seg[0] === "l";
  }
}
