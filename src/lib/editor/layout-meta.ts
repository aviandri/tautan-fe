/**
 * P3-D Text and layout cards: editor metadata and validators (mirror SPEC "P3-C/D: implemented (BE)").
 */
import { Briefcase, Columns2, ListOrdered, MapPin, Megaphone, Sparkle } from "lucide-react";
import type { BlockDataMap } from "../types";
import { MARQUEE_SPEEDS } from "../types";
import { compact, maxLen, plural, put, required, withSchedule, type BlockMeta, type FieldErrors } from "./meta-core";
import { stripKeys } from "./engage-meta";
import { httpUrlError, imageUrlError } from "./sell-meta";

export type LayoutType = "spotlight" | "marquee" | "timeline" | "resume" | "before_after" | "map";

const trim = (s: string | undefined) => (s ?? "").trim();
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Coordinates from a pasted map link or "lat, lng" text: Google Maps (@lat,lng / q=lat,lng /
 * !3dlat!4dlng), Apple Maps (ll=), OpenStreetMap (mlat/mlon or #map=z/lat/lng).
 */
export function parseCoords(raw: string): { lat: number; lng: number } | null {
  const s = decodeURIComponent(raw.trim());
  const pats = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query|daddr|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /mlat=(-?\d+(?:\.\d+)?)&mlon=(-?\d+(?:\.\d+)?)/,
    /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/,
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/,
  ];
  for (const re of pats) {
    const m = s.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)) return { lat, lng };
    }
  }
  return null;
}

export const LAYOUT_META: { [K in LayoutType]: BlockMeta<K> } = {
  spotlight: {
    type: "spotlight",
    label: "Spotlight",
    description: "A big hero card for a drop or launch",
    icon: Sparkle,
    tint: "#ca8a04",
    defaultData: () => ({ headline: "", align: "left" }),
    needsInputFirst: true,
    summary: (d) => d.headline || "No headline yet",
    validate: withSchedule<"spotlight">((d) => {
      const e: FieldErrors = {};
      const headline = trim(d.headline);
      put(e, "headline", required(headline) ? "Add a headline" : maxLen(headline, 100));
      put(e, "eyebrow", maxLen(d.eyebrow, 40));
      put(e, "text", maxLen(d.text, 300));
      put(e, "image_url", imageUrlError(d.image_url));
      let button = d.button;
      if (button && !trim(button.label) && !trim(button.url)) button = undefined;
      if (button) {
        button = { label: trim(button.label), url: trim(button.url) };
        put(e, "button.label", required(button.label) ? "Add a button label" : maxLen(button.label, 40));
        put(e, "button.url", httpUrlError(button.url, true));
      }
      const data = compact({ ...d, headline, button }, ["image_url", "eyebrow", "text", "button"]);
      return { errors: e, data };
    }),
  },
  marquee: {
    type: "marquee",
    label: "Marquee",
    description: "A scrolling text ribbon",
    icon: Megaphone,
    tint: "#ea580c",
    defaultData: () => ({ text: "", speed: "normal", direction: "left", style: "ribbon" }),
    needsInputFirst: true,
    summary: (d) => d.text || "No text yet",
    validate: withSchedule<"marquee">((d) => {
      const e: FieldErrors = {};
      const text = trim(d.text);
      put(e, "text", required(text) ? "Add some text" : maxLen(text, 200));
      put(e, "separator", maxLen(d.separator, 8));
      if (d.speed && !MARQUEE_SPEEDS.includes(d.speed)) put(e, "speed", "Pick a speed");
      return { errors: e, data: compact({ ...d, text }, ["separator"]) };
    }),
  },
  timeline: {
    type: "timeline",
    label: "Timeline",
    description: "Numbered or dotted steps",
    icon: ListOrdered,
    tint: "#0f766e",
    defaultData: () => ({ style: "numbered", items: [{ title: "" }] }),
    needsInputFirst: true,
    summary: (d) => (d.title || d.items[0]?.title || "Timeline") + ` · ${plural(d.items.length, "step")}`,
    validate: withSchedule<"timeline">((d) => {
      const e: FieldErrors = {};
      put(e, "title", maxLen(d.title, 60));
      if (!d.items.length) put(e, "items", "Add at least one step");
      if (d.items.length > 20) put(e, "items", "Up to 20 steps");
      let highlighted = 0;
      const items = d.items.map((it, i) => {
        const o = compact({ ...it, title: trim(it.title), eyebrow: trim(it.eyebrow), description: trim(it.description), badge: trim(it.badge) }, ["eyebrow", "description", "badge"]);
        put(e, `items.${i}.title`, required(o.title) ? "Add a title" : maxLen(o.title, 100));
        put(e, `items.${i}.eyebrow`, maxLen(o.eyebrow, 40));
        put(e, `items.${i}.description`, maxLen(o.description, 300));
        put(e, `items.${i}.badge`, maxLen(o.badge, 24));
        if (o.highlight && ++highlighted > 1) put(e, `items.${i}.highlight`, "Only one step can be highlighted");
        if (!o.highlight) delete o.highlight;
        return o;
      });
      return { errors: e, data: compact({ ...d, items }, ["title"]) };
    }),
  },
  resume: {
    type: "resume",
    label: "Resume",
    description: "Work history with dates",
    icon: Briefcase,
    tint: "#334155",
    defaultData: () => ({ items: [{ role: "", company: "", start: "", current: true }] }),
    needsInputFirst: true,
    summary: (d) => (d.items[0] ? `${d.items[0].role || "Role"} at ${d.items[0].company || "…"}` : "No jobs yet"),
    validate: withSchedule<"resume">((d) => {
      const e: FieldErrors = {};
      put(e, "title", maxLen(d.title, 60));
      if (!d.items.length) put(e, "items", "Add at least one job");
      if (d.items.length > 30) put(e, "items", "Up to 30 jobs");
      const items = d.items.map((it, i) => {
        const o = compact(
          { ...it, role: trim(it.role), company: trim(it.company), company_url: trim(it.company_url), description: trim(it.description), end: it.current ? undefined : it.end },
          ["company_url", "description", "end"],
        );
        if (!o.current) delete o.current;
        put(e, `items.${i}.role`, required(o.role) ? "Add the role" : maxLen(o.role, 80));
        put(e, `items.${i}.company`, required(o.company) ? "Add the company" : maxLen(o.company, 80));
        put(e, `items.${i}.company_url`, httpUrlError(o.company_url, false));
        put(e, `items.${i}.start`, MONTH.test(o.start) ? null : "Pick a start month");
        if (o.end && !MONTH.test(o.end)) put(e, `items.${i}.end`, "Pick an end month");
        else if (o.end && o.end < o.start) put(e, `items.${i}.end`, "Ends before it starts");
        put(e, `items.${i}.description`, maxLen(o.description, 500));
        return o;
      });
      return { errors: e, data: compact({ ...d, items }, ["title"]) };
    }),
  },
  before_after: {
    type: "before_after",
    label: "Before and after",
    description: "A slider between two photos",
    icon: Columns2,
    tint: "#a16207",
    defaultData: () => ({ before_url: "", after_url: "", before_label: "Before", after_label: "After" }),
    needsInputFirst: true,
    summary: (d) => d.alt || [d.before_label, d.after_label].filter(Boolean).join(" / ") || "Before and after",
    validate: withSchedule<"before_after">((d) => {
      const e: FieldErrors = {};
      put(e, "before_url", d.before_url ? imageUrlError(d.before_url) : "Add the before photo");
      put(e, "after_url", d.after_url ? imageUrlError(d.after_url) : "Add the after photo");
      put(e, "before_label", maxLen(d.before_label, 20));
      put(e, "after_label", maxLen(d.after_label, 20));
      put(e, "alt", maxLen(d.alt, 200));
      if (d.start_pct !== undefined && (!Number.isFinite(d.start_pct) || d.start_pct < 0 || d.start_pct > 100)) put(e, "start_pct", "0 to 100");
      return { errors: e, data: compact({ ...d }, ["before_label", "after_label", "alt"]) };
    }),
  },
  map: {
    type: "map",
    label: "Map",
    description: "Your location with directions",
    icon: MapPin,
    tint: "#15803d",
    defaultData: () => ({ lat: 0, lng: 0, zoom: 15 }),
    needsInputFirst: true,
    summary: (d) => d.label || d.address || d.area || (d.lat || d.lng ? `${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}` : "No location yet"),
    validate: withSchedule<"map">((d) => {
      const e: FieldErrors = {};
      put(e, "label", maxLen(d.label, 80));
      put(e, "address", maxLen(d.address, 200));
      put(e, "area", maxLen(d.area, 100));
      if (!Number.isFinite(d.lat) || d.lat < -90 || d.lat > 90) put(e, "lat", "Between -90 and 90");
      if (!Number.isFinite(d.lng) || d.lng < -180 || d.lng > 180) put(e, "lng", "Between -180 and 180");
      if (d.lat === 0 && d.lng === 0) put(e, "lat", "Set the location");
      if (d.zoom !== undefined && (!Number.isInteger(d.zoom) || d.zoom < 3 || d.zoom > 19)) put(e, "zoom", "3 to 19");
      const data = compact(stripKeys({ ...d, label: trim(d.label), address: trim(d.address), area: trim(d.area) }, ["links"]), ["label", "address", "area"]);
      return { errors: e, data };
    }),
  },
};

export type ResumeItem = BlockDataMap["resume"]["items"][number];
