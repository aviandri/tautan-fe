import type { Block } from "@/lib/types";
import { groupBlocks } from "@/lib/page-structure";
export { firstImageId } from "@/lib/page-structure";
import type { PageEnv } from "./env";
import { makeSurfacer, type PaletteMode, type SurfaceAssignment } from "@/lib/palette";
import { s } from "./cls";
import { LinkBlock, LinkGroup } from "./blocks/LinkBlock";
import { ImageBlock, MusicBlock, TextBlock, VideoBlock } from "./blocks/MediaBlocks";
import { SocialIconsBlock } from "./blocks/SocialIconsBlock";
import { FaqBlock, FolderBlock, TestimonialBlock } from "./blocks/DisclosureBlocks";
import { BookingBlock, CountdownBlock, DiscountCodeBlock, DividerBlock, FileBlock, HeadingBlock, QuoteBlock } from "./blocks/P2Blocks";
import { ContactFormIsland, EmailSignupIsland, FormIsland } from "./islands";
import { MarketplaceBlock, ProductBlock, ShopBlock, WhatsAppBlock } from "./blocks/SellBlocksA";
import { BrandsBlock, CommunityBlock, EventsBlock, GalleryBlock, LatestVideoBlock, MediaKitBlock, PodcastBlock, PostGridBlock, RateCardBlock, ShopTheLookBlock } from "./blocks/CreatorBlocks";
import { PaymentBlock, PriceListBlock, ReviewsBlock, StoreInfoBlock, TipJarBlock } from "./blocks/SellBlocksB";
import { AskMeBlock, GiveawayBlock, LeadMagnetBlock, PollBlock } from "./blocks/EngageBlocks";
import { LockedCard } from "./blocks/GateBlocks";
import { BeforeAfterBlock, DiscountCodesBlock, DonateIconsBlock, MapBlock, MarqueeBlock, ResumeBlock, SpotlightBlock, StyledText, TimelineBlock } from "./blocks/LayoutBlocks";

// Server-safe: no hooks, no context. On the public route every card here renders as server HTML;
// only the form islands ship React code (lazily). In the editor preview the same tree renders on the client.

export interface RenderOpts {
  env: PageEnv;
  /** render time, for countdowns (PageRuntime keeps them ticking) */
  now: number;
  /** the image block to load with high priority (the page's LCP candidate) */
  priorityId?: string;
  /** themes v3: how cards take palette surfaces (absent = single colour, as before) */
  palette?: { mode: PaletteMode; count: number };
}

export function BlockRenderer({ block, childBlocks = [], opts }: { block: Block; childBlocks?: Block[]; opts: RenderOpts }) {
  const { env } = opts;
  // gated card the visitor hasn't unlocked: the API sends data:null; the stub's unlock form and the
  // re-open from a saved token run in the lazy runtime-p3cd
  if (block.locked || block.data == null) return block.locked ? <LockedCard block={block} /> : null;
  switch (block.type) {
    case "link":
      return <LinkBlock block={block} env={env} />;
    case "text":
      return block.data.style ? <StyledText block={block} style={block.data.style} /> : <TextBlock block={block} />;
    case "image":
      return <ImageBlock block={block} env={env} priority={block.id === opts.priorityId} />;
    case "video":
      return <VideoBlock block={block} env={env} priority={block.id === opts.priorityId} />;
    case "music":
      return <MusicBlock block={block} env={env} />;
    case "social_icons":
      return block.data.variant === "donate" ? <DonateIconsBlock block={block} /> : <SocialIconsBlock block={block} preview={env.preview} />;
    case "folder":
      return (
        <FolderBlock block={block} env={env}>
          {childBlocks}
        </FolderBlock>
      );
    case "faq":
      return <FaqBlock block={block} preview={env.preview} />;
    case "testimonial":
      return <TestimonialBlock block={block} preview={env.preview} />;
    case "contact_form":
      return <ContactFormIsland block={block} username={env.username} preview={env.preview} />;
    case "heading":
      return <HeadingBlock block={block} />;
    case "divider":
      return <DividerBlock block={block} />;
    case "file":
      return <FileBlock block={block} env={env} />;
    case "discount_code":
      return block.data.codes?.length ? <DiscountCodesBlock block={block} /> : <DiscountCodeBlock block={block} />;
    case "countdown":
      return <CountdownBlock block={block} now={opts.now} />;
    case "booking":
      return <BookingBlock block={block} />;
    case "quote":
      return <QuoteBlock block={block} />;
    case "email_signup":
      return <EmailSignupIsland block={block} username={env.username} preview={env.preview} />;
    case "form":
      return <FormIsland block={block} username={env.username} preview={env.preview} />;
    case "product":
      return <ProductBlock block={block} env={env} priority={block.id === opts.priorityId} />;
    case "shop":
      return <ShopBlock block={block} env={env} />;
    case "marketplace":
      return <MarketplaceBlock block={block} />;
    case "whatsapp":
      return <WhatsAppBlock block={block} env={env} />;
    // P3-A sell (b)
    case "price_list":
      return <PriceListBlock block={block} env={env} />;
    case "store_info":
      return <StoreInfoBlock block={block} now={opts.now} />;
    case "payment":
      return <PaymentBlock block={block} env={env} />;
    case "tip_jar":
      return <TipJarBlock block={block} />;
    case "reviews":
      return <ReviewsBlock block={block} />;
    case "media_kit":
      return <MediaKitBlock block={block} />;
    case "rate_card":
      return <RateCardBlock block={block} />;
    case "brands":
      return <BrandsBlock block={block} env={env} />;
    case "post_grid":
      return <PostGridBlock block={block} env={env} />;
    case "latest_video":
      return <LatestVideoBlock block={block} env={env} />;
    case "shop_the_look":
      return <ShopTheLookBlock block={block} env={env} />;
    case "gallery":
      return <GalleryBlock block={block} env={env} />;
    case "events":
      return <EventsBlock block={block} />;
    case "podcast":
      return <PodcastBlock block={block} env={env} />;
    case "community":
      return <CommunityBlock block={block} />;
    // P3-C engage
    case "poll":
      return <PollBlock block={block} />;
    case "ask_me":
      return <AskMeBlock block={block} />;
    case "lead_magnet":
      return <LeadMagnetBlock block={block} env={env} />;
    case "giveaway":
      return <GiveawayBlock block={block} />;
    // P3-D text and layout
    case "spotlight":
      return <SpotlightBlock block={block} env={env} priority={block.id === opts.priorityId} />;
    case "marquee":
      return <MarqueeBlock block={block} />;
    case "timeline":
      return <TimelineBlock block={block} />;
    case "resume":
      return <ResumeBlock block={block} />;
    case "before_after":
      return <BeforeAfterBlock block={block} env={env} />;
    case "map":
      return <MapBlock block={block} />;
    default:
      // unknown type from a newer API: skip rather than crash the page
      return null;
  }
}

/** Wrapper classes for a surface: tp-sN, plus tp-sb when the card is itself a button. */
function surfaceClass(a: SurfaceAssignment | null): string | undefined {
  return a ? `${s[`s${a.index}`]}${a.button ? ` ${s.sb}` : ""}` : undefined;
}

export function BlockList({ blocks, childrenOf, opts }: { blocks: Block[]; childrenOf: Map<string, Block[]>; opts: RenderOpts }) {
  // themes v3: each card sits in a display:contents wrapper whose class picks its palette surface
  const next = opts.palette ? makeSurfacer(opts.palette.mode, opts.palette.count) : null;
  return (
    <>
      {groupBlocks(blocks).map((it) => {
        if (it.kind === "group") {
          const tiles = next ? new Map(it.blocks.map((b) => [b.id, surfaceClass(next(b.type, !!b.locked))])) : null;
          return <LinkGroup key={`g-${it.blocks[0].id}`} layout={it.layout} blocks={it.blocks} env={opts.env} tileClass={tiles ? (b) => tiles.get(b.id) : undefined} />;
        }
        const card = <BlockRenderer key={it.block.id} block={it.block} childBlocks={childrenOf.get(it.block.id)} opts={opts} />;
        const cls = next ? surfaceClass(next(it.block.type, !!it.block.locked)) : undefined;
        return cls ? (
          <div key={it.block.id} className={cls}>
            {card}
          </div>
        ) : (
          card
        );
      })}
    </>
  );
}
