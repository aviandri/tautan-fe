/**
 * P3 platform metadata with real brand marks from simple-icons where they exist. Platforms without
 * a simple-icons mark get `icon: null`: render a neutral monogram, never a drawn look-alike (SPEC P3).
 * Code that only needs labels, hosts or detection imports ./platforms-meta instead.
 */
import { siBlibli, siBukalapak, siBuymeacoffee, siEtsy, siGumroad, siKofi, siPaypal, siShopee, siTiktok, type SimpleIcon } from "simple-icons";
import type { TIP_PLATFORMS } from "../constants";
import type { MarketplacePlatform } from "../types";
import { MARKETPLACES as M, TIPS as T, type PlatformMeta as Meta } from "./platforms-meta";

export * from "./platforms-meta";

export interface PlatformMeta extends Meta {
  icon: SimpleIcon | null;
}

type Tip = (typeof TIP_PLATFORMS)[number];
const MI: Record<MarketplacePlatform, SimpleIcon | null> = {
  shopee: siShopee,
  tokopedia: null,
  tiktok_shop: siTiktok,
  lazada: null,
  blibli: siBlibli,
  bukalapak: siBukalapak,
  etsy: siEtsy,
  amazon: null,
  gumroad: siGumroad,
};
const TI: Record<Tip, SimpleIcon | null> = { saweria: null, trakteer: null, kofi: siKofi, paypal: siPaypal, buymeacoffee: siBuymeacoffee };

const withIcons = <K extends string>(base: Record<K, Meta>, icons: Record<K, SimpleIcon | null>) =>
  Object.fromEntries((Object.keys(base) as K[]).map((k) => [k, { ...base[k], icon: icons[k] }])) as Record<K, PlatformMeta>;

export const MARKETPLACES = withIcons<MarketplacePlatform>(M, MI);
export const TIPS = withIcons<Tip>(T, TI);
