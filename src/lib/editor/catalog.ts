/**
 * The "Add a card" catalog: categories, search synonyms (English and Indonesian),
 * longer copy for the preview pane, and sample data to render a preview with.
 */
import type { BlockDataMap, BlockType } from "../types";
import { BLOCK_META } from "./block-meta";

export type CategoryId = "all" | "sell" | "creators" | "engage" | "links" | "grow" | "media" | "text";

export const CATEGORIES: { id: Exclude<CategoryId, "all">; label: string; types: BlockType[] }[] = [
  {
    id: "sell",
    label: "Sell and book",
    types: ["product", "shop", "whatsapp", "marketplace", "price_list", "payment", "store_info", "booking", "discount_code", "tip_jar", "reviews"],
  },
  { id: "creators", label: "Creators", types: ["media_kit", "rate_card", "brands", "events", "post_grid", "latest_video", "shop_the_look", "community", "gallery", "podcast"] },
  { id: "engage", label: "Engage", types: ["poll", "ask_me", "lead_magnet", "giveaway"] },
  { id: "links", label: "Links and buttons", types: ["link", "folder", "file", "social_icons"] },
  { id: "grow", label: "Grow your audience", types: ["email_signup", "form", "contact_form", "countdown", "testimonial", "faq"] },
  { id: "media", label: "Video and music", types: ["video", "music", "image"] },
  { id: "text", label: "Text and layout", types: ["heading", "text", "quote", "divider", "spotlight", "marquee", "timeline", "resume", "before_after", "map"] },
];

export const ALL_TYPES: BlockType[] = CATEGORIES.flatMap((c) => c.types);

export const POPULAR: BlockType[] = ["link", "product", "whatsapp", "discount_code", "file", "email_signup"];

interface Entry {
  /** search synonyms, lower case; phrases allowed */
  keywords: string[];
  /** a sentence or two for the preview pane */
  blurb: string;
  /** up to 3 short feature lines */
  features?: string[];
  /** data for a preview render (omit to show the icon) */
  sample?: unknown;
}

export const CATALOG: Record<BlockType, Entry> = {
  // ----- sell and book -----
  product: {
    keywords: ["produk", "barang", "item", "jual", "jualan", "sell", "buy", "beli", "harga", "price", "toko", "dagangan", "preorder", "po"],
    blurb: "One product with photos, price and a buy button that opens WhatsApp, your marketplace listing or any link.",
    features: ["Up to 8 photos, sale price and badges", "Sizes, flavours or colours", "Every buy tap shows up in Insights"],
    sample: {
      images: [],
      name: "Fudgy brownies, 20×20",
      price: 8500000,
      compare_at: 9500000,
      currency: "IDR",
      badge: "best_seller",
      variants: [{ name: "Flavour", options: ["Original", "Cheese", "Matcha"] }],
      action: { kind: "whatsapp", wa_number: "+6281234567890" },
    } satisfies BlockDataMap["product"],
  },
  shop: {
    keywords: ["toko", "katalog", "catalog", "store", "etalase", "products", "produk", "jualan", "jual", "grid", "shop", "olshop"],
    blurb: "A grid of products with category chips. Tapping a product opens its photos, options and buy button.",
    features: ["2 columns on phones, 3 on desktop", "Filter by category", "Up to 60 products"],
    sample: {
      categories: ["Stickers", "Prints"],
      items: [
        { id: "a", images: [], name: "Cat pack", price: 3500000, category: "Stickers", action: { kind: "url", url: "https://example.com" } },
        { id: "b", images: [], name: "A4 print", price: 12000000, category: "Prints", action: { kind: "url", url: "https://example.com" } },
      ],
    } satisfies BlockDataMap["shop"],
  },
  whatsapp: {
    keywords: ["wa", "whatsapp", "chat", "order", "pesan", "pesanan", "pesan antar", "kontak", "wa.me", "preorder", "po", "delivery", "antar"],
    blurb: "A WhatsApp button, or a small order form that sends the visitor's items, name and address as a ready-to-send message.",
    features: ["Menu with quantities and prices", "Message template you control", "No checkout or fees"],
    sample: {
      label: "Order on WhatsApp",
      number: "+6281234567890",
      message_template: "Hi! I'd like to order:\n{items}",
      order_form: { fields: ["items", "name"], items: [{ name: "Brownies, 1 box", price: 8500000 }, { name: "Cookies, 1 jar", price: 6500000 }] },
    } satisfies BlockDataMap["whatsapp"],
  },
  marketplace: {
    keywords: ["shopee", "tokopedia", "tiktok shop", "lazada", "blibli", "bukalapak", "etsy", "amazon", "gumroad", "toko online", "olshop", "online shop", "buy on", "marketplace", "toko"],
    blurb: "A “Buy on” row with the real marks of your Shopee, Tokopedia, TikTok Shop and other stores.",
    sample: {
      title: "Also on",
      stores: [
        { platform: "shopee", url: "https://shopee.co.id/example" },
        { platform: "tokopedia", url: "https://www.tokopedia.com/example" },
        { platform: "tiktok_shop", url: "https://shop.tiktok.com/example" },
      ],
    } satisfies BlockDataMap["marketplace"],
  },
  price_list: {
    keywords: ["daftar harga", "harga", "menu", "pricelist", "price list", "tarif", "jasa", "services", "rate", "layanan", "pricing"],
    blurb: "Your services or menu with prices, in sections, with optional photos and an ask button.",
    sample: {
      currency: "IDR",
      sections: [
        { title: "Portraits", items: [{ name: "Head and shoulders", price: 25000000 }, { name: "Full body", price: 40000000 }, { name: "Extra person", price: 15000000, price_from: true }] },
      ],
    } satisfies BlockDataMap["price_list"],
  },
  payment: {
    keywords: ["bayar", "pembayaran", "transfer", "rekening", "qris", "bank", "e-wallet", "ewallet", "gopay", "ovo", "dana", "shopeepay", "payment", "pay", "no rek"],
    blurb: "Your QRIS code and bank or e-wallet accounts with copy buttons, plus an “I've paid” button.",
    sample: { accounts: [{ bank: "BCA", name: "Sekar Ayu", number: "7310228841" }], note: "Send your receipt after paying." } satisfies BlockDataMap["payment"],
  },
  store_info: {
    keywords: ["jam buka", "jam operasional", "alamat", "lokasi", "hours", "open", "opening hours", "address", "map", "maps", "delivery", "kurir", "ongkir", "gosend", "grab", "store info", "toko"],
    blurb: "Opening hours with an “Open now” badge, your address with directions, and the couriers you deliver with.",
    sample: {
      hours: (["mon", "tue", "wed", "thu", "fri", "sat"] as const).map((day) => ({ day, open: "09:00", close: "21:00" })),
      tz: "Asia/Jakarta",
      address: "Jl. Braga No. 12",
      area: "Sumur Bandung, Bandung",
      couriers: ["gosend", "grabexpress", "jne"],
    } satisfies BlockDataMap["store_info"],
  },
  booking: {
    keywords: ["jadwal", "booking", "book", "reservasi", "calendar", "kalender", "calendly", "cal.com", "appointment", "janji", "schedule"],
    blurb: "Visitors pick a time in your Calendly or Cal.com calendar without leaving your page.",
    sample: { url: "https://cal.com/example" } satisfies BlockDataMap["booking"],
  },
  discount_code: {
    keywords: ["kode", "promo", "voucher", "kupon", "coupon", "diskon", "discount", "code", "potongan"],
    blurb: "A code visitors copy with one tap. Copies are counted in Insights.",
    sample: { code: "SEKAR10", description: "10% off your first order", button_label: "Copy code" } satisfies BlockDataMap["discount_code"],
  },
  tip_jar: {
    keywords: ["donasi", "dukung", "saweria", "trakteer", "kofi", "ko-fi", "tip", "tips", "donate", "support", "traktir", "buy me a coffee", "paypal"],
    blurb: "A “Support me” card with suggested amounts and your Saweria, Trakteer, Ko-fi or PayPal links.",
    sample: { title: "Buy me a coffee for the next zine", amounts: [1000000, 2500000, 5000000], platforms: [{ platform: "saweria", url: "https://saweria.co/example" }] } satisfies BlockDataMap["tip_jar"],
  },
  reviews: {
    keywords: ["ulasan", "review", "reviews", "rating", "bintang", "stars", "testimoni", "nilai"],
    blurb: "Your star rating and what customers say, with links to the original reviews on Google or Shopee.",
    sample: { average: 4.9, count: 312, source: "Shopee", items: [{ stars: 5, quote: "Arrived in two days, colours exactly like the photos.", author: "Rina" }] } satisfies BlockDataMap["reviews"],
  },

  // ----- creators -----
  media_kit: {
    keywords: ["media kit", "mediakit", "stats", "statistik", "followers", "pengikut", "engagement", "insight", "audience", "brand", "endorse", "endorsement", "kol", "influencer"],
    blurb: "Your followers, views and engagement per platform, plus who your audience is, with a PDF to download.",
    features: ["Per-platform stats", "Audience by age, gender and city", "Shows when it was last updated"],
  },
  rate_card: {
    keywords: ["rate card", "ratecard", "rate", "harga endorse", "endorse", "paket", "package", "collab", "kolaborasi", "kerja sama", "sponsor", "pricelist endorse"],
    blurb: "Collab packages with a “from” price, deliverables and turnaround. The button opens your request form.",
  },
  brands: {
    keywords: ["brands", "brand", "logo", "logos", "client", "klien", "worked with", "partner", "partners", "endorse", "pernah kerja sama"],
    blurb: "A “Worked with” wall of the brands you've partnered with.",
  },
  post_grid: {
    keywords: ["post", "posts", "feed", "instagram", "ig", "reels", "tiktok", "youtube shorts", "grid", "konten", "content", "pinned"],
    blurb: "Pin your best Instagram, TikTok or YouTube posts as a thumbnail grid. Paste the links, no login needed.",
  },
  latest_video: {
    keywords: ["youtube", "latest video", "video terbaru", "channel", "upload", "vlog", "yt"],
    blurb: "Shows the newest video from your YouTube channel and updates by itself.",
  },
  shop_the_look: {
    keywords: ["shop the look", "ootd", "outfit", "affiliate", "afiliasi", "tag", "hotspot", "spill", "racun", "link produk", "look"],
    blurb: "A photo with tappable tags. Each tag opens a product or affiliate link with its price and code.",
  },
  gallery: {
    keywords: ["gallery", "galeri", "photos", "foto", "carousel", "slider", "portfolio", "portofolio", "album"],
    blurb: "A grid or swipeable carousel of photos that open full screen.",
  },
  events: {
    keywords: ["events", "event", "acara", "jadwal", "schedule", "live", "jadwal live", "live tiktok", "live shopee", "tour", "konser", "workshop", "tiket", "tickets", "dates"],
    blurb: "Tour and workshop dates with ticket links, or a weekly live schedule with a “Live now” badge.",
    features: ["Dates with Sold out or Few left", "Weekly live slots in your time zone", "Past dates hide themselves"],
  },
  podcast: {
    keywords: ["podcast", "rss", "episode", "episodes", "audio", "siaran", "spotify podcast", "apple podcasts"],
    blurb: "The latest episodes from your podcast feed, with a player.",
  },
  community: {
    keywords: ["community", "komunitas", "grup", "group", "grup wa", "whatsapp group", "channel wa", "saluran", "telegram", "discord", "line", "join", "gabung", "member"],
    blurb: "A join card for your WhatsApp group or channel, Telegram, Discord or LINE.",
  },

  // ----- links and buttons -----
  link: {
    keywords: ["tautan", "url", "website", "web", "button", "tombol", "link"],
    blurb: "A button to any website, email, file or another tab, in one of seven layouts.",
    sample: { title: "Latest episode", url: "https://example.com" } satisfies BlockDataMap["link"],
  },
  folder: {
    keywords: ["grup", "group", "kumpulan", "collection", "folder", "menu"],
    blurb: "Groups several links behind one button, or shows them all at once.",
  },
  file: {
    keywords: ["pdf", "unduh", "download", "ebook", "e-book", "zip", "mp3", "file", "dokumen", "katalog pdf"],
    blurb: "A PDF, ZIP, audio or video file visitors can download.",
    sample: { title: "Price list 2026", url: "https://example.com/price-list.pdf", file_name: "price-list.pdf", size: 1200000 } satisfies BlockDataMap["file"],
  },
  social_icons: {
    keywords: ["sosmed", "social", "instagram", "ig", "tiktok", "youtube", "twitter", "x", "facebook", "icons"],
    blurb: "A row of icons linking to your other profiles.",
    sample: { items: [{ platform: "instagram", url: "https://instagram.com/example" }, { platform: "tiktok", url: "https://tiktok.com/@example" }, { platform: "youtube", url: "https://youtube.com/@example" }] } satisfies BlockDataMap["social_icons"],
  },

  // ----- grow -----
  email_signup: {
    keywords: ["newsletter", "email", "subscribe", "langganan", "mailing list", "sign up", "signup", "daftar"],
    blurb: "Collects email addresses into your Audience, ready to export.",
    sample: { title: "Get restock alerts", button_label: "Subscribe", placeholder: "you@example.com" } satisfies BlockDataMap["email_signup"],
  },
  form: {
    keywords: ["formulir", "form", "survey", "survei", "pendaftaran", "registration", "rsvp", "order form", "google form", "kuesioner", "questionnaire", "request"],
    blurb: "Your own fields: questions, choices, dates and files. Answers arrive in Forms.",
  },
  contact_form: {
    keywords: ["kontak", "contact", "hubungi", "pesan", "message", "inquiry", "email me"],
    blurb: "Visitors send you a message with their name and email. Replies arrive in your Inbox.",
    sample: { title: "Get in touch", button_label: "Send" } satisfies BlockDataMap["contact_form"],
  },
  countdown: {
    keywords: ["hitung mundur", "countdown", "timer", "launch", "peluncuran", "event", "drop", "rilis"],
    blurb: "Counts down to a launch, drop or event date.",
  },
  testimonial: {
    keywords: ["testimoni", "testimonial", "testimonials", "kata mereka", "review", "client"],
    blurb: "Quotes from people you've worked with.",
    sample: { items: [{ quote: "Fast, careful and lovely to work with.", author: "Dimas" }] } satisfies BlockDataMap["testimonial"],
  },
  faq: {
    keywords: ["tanya jawab", "pertanyaan", "questions", "faq", "q&a", "help"],
    blurb: "Questions and answers that open with a tap.",
    sample: { items: [{ q: "Do you ship outside Java?", a: "Yes, with JNE and J&T." }] } satisfies BlockDataMap["faq"],
  },

  // ----- media -----
  video: { keywords: ["youtube", "vimeo", "video", "film", "clip", "tiktok video"], blurb: "A YouTube or Vimeo video that plays on your page." },
  music: { keywords: ["spotify", "soundcloud", "lagu", "song", "music", "musik", "podcast", "audio"], blurb: "A Spotify or SoundCloud player." },
  image: { keywords: ["foto", "gambar", "photo", "picture", "banner", "image", "poster"], blurb: "A photo, optionally linked, full width or framed." },

  // ----- text and layout -----
  heading: {
    keywords: ["judul", "title", "section", "header", "heading", "bagian"],
    blurb: "A section title to break your page into parts.",
    sample: { title: "Shop" } satisfies BlockDataMap["heading"],
  },
  text: {
    keywords: ["teks", "text", "paragraf", "paragraph", "bio", "about", "tentang", "deskripsi"],
    blurb: "A paragraph with simple formatting.",
    sample: { content: "Small-batch brownies baked to order in Yogyakarta." } satisfies BlockDataMap["text"],
  },
  quote: {
    keywords: ["kutipan", "quote", "quotes", "highlight"],
    blurb: "A highlighted quote, with who said it.",
    sample: { quote: "Make the thing you wish existed.", name: "Sekar" } satisfies BlockDataMap["quote"],
  },
  divider: {
    keywords: ["pemisah", "spacer", "line", "garis", "separator", "divider", "space", "jarak"],
    blurb: "A line or some space between cards.",
    sample: { style: "dashed" } satisfies BlockDataMap["divider"],
  },
  // ----- engage -----
  poll: {
    keywords: ["poll", "polling", "vote", "voting", "survei", "survey", "pilih", "pilihan", "tanya", "kuis", "quiz"],
    blurb: "Ask one question with up to five answers. Visitors vote once a day and can see the results.",
    features: ["Results after voting, always or never", "Optional closing time", "Totals in your dashboard"],
    sample: {
      question: "Which flavour should we bake next?",
      options: [
        { id: "a", label: "Pandan" },
        { id: "b", label: "Matcha" },
        { id: "c", label: "Red velvet" },
      ],
      show_results: "after_vote",
    } satisfies BlockDataMap["poll"],
  },
  ask_me: {
    keywords: ["ask me", "ama", "ask me anything", "tanya", "tanya aku", "pertanyaan", "question", "questions", "anonim", "anonymous", "qna", "q&a", "curhat"],
    blurb: "An anonymous question box. Questions land in your dashboard, and you can pin answered ones as a public Q&A.",
    features: ["Anonymous, rate limited", "Answer, pin or delete", "Pinned answers show on the page"],
    sample: { prompt: "Ask me anything about running a home bakery", public_answers: true } satisfies BlockDataMap["ask_me"],
  },
  lead_magnet: {
    keywords: ["lead magnet", "freebie", "gratis", "free", "download", "unduh", "ebook", "e-book", "pdf", "guide", "panduan", "template", "checklist"],
    blurb: "Give away a file in exchange for an email. Visitors join your Audience, then get a private download link.",
    features: ["The file link is never public", "Adds the email to Audience", "Optional mailing-list opt-in"],
    sample: { title: "Free pricing template", description: "The spreadsheet I use to price every order.", file_url: "https://example.com/template.xlsx", subscribe: "ask" } satisfies BlockDataMap["lead_magnet"],
  },
  giveaway: {
    keywords: ["giveaway", "ga", "undian", "hadiah", "prize", "contest", "kontes", "lomba", "win", "menang", "gratis"],
    blurb: "Collect entries by email until a closing time, then draw a random winner who appears on the card.",
    features: ["One entry per email", "Follow-us steps", "Random draw, winner shown masked"],
    sample: {
      title: "Win a tote bag",
      prize: "Canvas tote + sticker pack",
      ends_at: "2030-01-01T12:00:00Z",
      steps: [{ label: "Follow us on Instagram", url: "https://instagram.com/example" }],
      subscribe: "ask",
    } satisfies BlockDataMap["giveaway"],
  },
  // ----- text and layout (P3-D) -----
  spotlight: {
    keywords: ["spotlight", "hero", "banner", "highlight", "sorotan", "launch", "drop", "rilis", "promo", "featured"],
    blurb: "A big card with an image, headline, short text and a button: for a drop, a launch or your main offer.",
    sample: { eyebrow: "New drop", headline: "The rainy-season collection", text: "Out Friday at 20:00.", button: { label: "Shop now", url: "https://example.com" }, align: "left" } satisfies BlockDataMap["spotlight"],
  },
  marquee: {
    keywords: ["marquee", "ticker", "running text", "teks berjalan", "ribbon", "pita", "scrolling", "announcement", "pengumuman"],
    blurb: "A scrolling ribbon of text, like “FREE SHIPPING ✦ OPEN PO ✦”. Not clickable.",
    sample: { text: "FREE SHIPPING ALL JAVA", separator: "✦", speed: "normal", direction: "left", style: "ribbon" } satisfies BlockDataMap["marquee"],
  },
  timeline: {
    keywords: ["timeline", "steps", "langkah", "cara", "how to", "cara order", "alur", "process", "proses", "roadmap", "tahapan"],
    blurb: "Numbered or dotted steps, such as how to order, with one step highlighted.",
    sample: {
      style: "numbered",
      items: [{ title: "Choose your box" }, { title: "Pay with QRIS", highlight: true }, { title: "We deliver in 2 days" }],
    } satisfies BlockDataMap["timeline"],
  },
  resume: {
    keywords: ["resume", "cv", "experience", "pengalaman", "work", "kerja", "career", "karir", "riwayat", "portfolio", "portofolio"],
    blurb: "Your work history: role, company, dates and what you did.",
    sample: { items: [{ role: "Pastry chef", company: "Kopi Pagi", start: "2022-03", current: true }] } satisfies BlockDataMap["resume"],
  },
  before_after: {
    keywords: ["before after", "before", "after", "sebelum sesudah", "sebelum", "sesudah", "transformasi", "transformation", "slider", "renovasi", "salon", "makeover"],
    blurb: "Drag a slider between two photos. Great for salons, renovations and photo editing.",
  },
  map: {
    keywords: ["map", "peta", "lokasi", "location", "alamat", "address", "directions", "arah", "maps", "google maps", "toko"],
    blurb: "Where to find you, with Directions buttons for Google Maps, Apple Maps and OpenStreetMap. No map tiles load for visitors.",
    sample: { label: "Toko Kue Bu Rina", address: "Jl. Braga No. 10", area: "Bandung", lat: -6.91746, lng: 107.60981, zoom: 15 } satisfies BlockDataMap["map"],
  },
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
const words = (s: string) => norm(s).split(/[^a-z0-9.&]+/).filter(Boolean);

/**
 * Rank card types for a query. Every query word must match something:
 * the label (best), a synonym (exact beats prefix), or the description.
 * Returns types best-first; empty query returns [].
 */
export function searchCards(query: string, types: BlockType[] = ALL_TYPES): BlockType[] {
  const q = norm(query);
  if (!q) return [];
  const qWords = words(q);
  const scored: { t: BlockType; score: number; order: number }[] = [];
  types.forEach((t, order) => {
    const m = BLOCK_META[t];
    const e = CATALOG[t];
    const label = norm(m.label);
    const labelWords = words(m.label);
    const kws = e.keywords.map(norm);
    const kwWords = kws.flatMap(words);
    const descWords = words(`${m.description} ${e.blurb}`);
    let total = 0;
    // a whole-phrase synonym match ("tiktok shop", "daftar harga")
    if (qWords.length > 1 && kws.includes(q)) total += 6;
    if (label === q) total += 8;
    for (const w of qWords) {
      let s = 0;
      if (labelWords.includes(w)) s = 5;
      else if (kws.includes(w) || kwWords.includes(w)) s = 4;
      else if (labelWords.some((x) => x.startsWith(w))) s = 3;
      else if (w.length >= 2 && kwWords.some((x) => x.startsWith(w))) s = 2;
      else if (w.length >= 3 && descWords.some((x) => x.startsWith(w))) s = 1;
      if (!s) return;
      total += s;
    }
    scored.push({ t, score: total, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((x) => x.t);
}
