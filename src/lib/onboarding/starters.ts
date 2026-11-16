/**
 * P2-6 starter sections, by intent. Only block types whose starting data is
 * valid without user input, and no invented facts: headings and labels only;
 * the user fills in the rest in the editor.
 */
import { FORM_PRESETS } from "../editor/block-meta";
import type { BlockDataMap, BlockType, CreateBlockInput, OnboardingIntent } from "../types";

export interface Starter<K extends BlockType = BlockType> {
  key: string;
  type: K;
  title: string;
  description: string;
  data: () => BlockDataMap[K];
}

const s = <K extends BlockType>(key: string, type: K, title: string, description: string, data: () => BlockDataMap[K]): Starter<K> => ({
  key,
  type,
  title,
  description,
  data,
});

const socials = s("socials", "social_icons", "Social icons", "Your profiles in one row", () => ({ items: [] }));
const signup = (title: string) => s("signup", "email_signup", "Email signup", "Grow a list you own", () => ({ title, button_label: "Subscribe", placeholder: "you@example.com" }));
const faq = s("faq", "faq", "FAQ", "Answer the questions you get every week", () => ({ heading: "Good to know", items: [{ q: "", a: "" }] }));

export const STARTERS: Record<OnboardingIntent, Starter[]> = {
  local: [
    s("booking_form", "form", "Booking request", "Visitors ask for a date and service", () => FORM_PRESETS.booking.data()),
    faq,
    s("contact", "contact_form", "Contact form", "Messages land in your Inbox", () => ({ title: "Ask us anything", button_label: "Send" })),
    socials,
  ],
  sell: [
    s("shop_heading", "heading", "Shop heading", "A title above your product links", () => ({ title: "Shop" })),
    s("reviews", "testimonial", "Testimonials", "Quotes from happy customers", () => ({ heading: "What customers say", items: [{ quote: "", author: "" }] })),
    signup("Be first to hear about new drops"),
    faq,
  ],
  audience: [
    socials,
    signup("Join the newsletter"),
    s("latest", "heading", "Latest heading", "A title above your newest links", () => ({ title: "Latest" })),
    s("waitlist", "form", "Waitlist form", "Collect names and emails", () => FORM_PRESETS.waitlist.data()),
  ],
  other: [socials, s("contact", "contact_form", "Contact form", "Messages land in your Inbox", () => ({ title: "Get in touch", button_label: "Send" })), signup("Stay in touch")],
};

export function starterBlock(st: Starter, tabId: string): CreateBlockInput {
  return { tab_id: tabId, type: st.type, data: st.data() } as CreateBlockInput;
}

export const INTENTS: { value: OnboardingIntent; title: string; description: string }[] = [
  { value: "local", title: "A local business", description: "Bookings, opening questions, directions" },
  { value: "sell", title: "Selling things", description: "Products, offers, reviews" },
  { value: "audience", title: "Growing an audience", description: "Socials, newsletter, latest work" },
  { value: "other", title: "Something else", description: "Start simple and build from there" },
];
