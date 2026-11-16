import type { Block } from "@/lib/types";
import { groupBlocks } from "@/lib/page-structure";
export { firstImageId } from "@/lib/page-structure";
import type { PageEnv } from "./env";
import { LinkBlock, LinkGroup } from "./blocks/LinkBlock";
import { ImageBlock, MusicBlock, TextBlock, VideoBlock } from "./blocks/MediaBlocks";
import { SocialIconsBlock } from "./blocks/SocialIconsBlock";
import { FaqBlock, FolderBlock, TestimonialBlock } from "./blocks/DisclosureBlocks";
import { BookingBlock, CountdownBlock, DiscountCodeBlock, DividerBlock, FileBlock, HeadingBlock, QuoteBlock } from "./blocks/P2Blocks";
import { ContactFormIsland, EmailSignupIsland, FormIsland } from "./islands";
import { MarketplaceBlock, ProductBlock, ShopBlock, WhatsAppBlock } from "./blocks/SellBlocksA";

// Server-safe: no hooks, no context. On the public route every card here renders as server HTML;
// only the form islands ship React code (lazily). In the editor preview the same tree renders on the client.

export interface RenderOpts {
  env: PageEnv;
  /** render time, for countdowns (PageRuntime keeps them ticking) */
  now: number;
  /** the image block to load with high priority (the page's LCP candidate) */
  priorityId?: string;
}

export function BlockRenderer({ block, childBlocks = [], opts }: { block: Block; childBlocks?: Block[]; opts: RenderOpts }) {
  const { env } = opts;
  switch (block.type) {
    case "link":
      return <LinkBlock block={block} env={env} />;
    case "text":
      return <TextBlock block={block} />;
    case "image":
      return <ImageBlock block={block} env={env} priority={block.id === opts.priorityId} />;
    case "video":
      return <VideoBlock block={block} env={env} priority={block.id === opts.priorityId} />;
    case "music":
      return <MusicBlock block={block} env={env} />;
    case "social_icons":
      return <SocialIconsBlock block={block} />;
    case "folder":
      return (
        <FolderBlock block={block} env={env}>
          {childBlocks}
        </FolderBlock>
      );
    case "faq":
      return <FaqBlock block={block} />;
    case "testimonial":
      return <TestimonialBlock block={block} />;
    case "contact_form":
      return <ContactFormIsland block={block} username={env.username} preview={env.preview} />;
    case "heading":
      return <HeadingBlock block={block} />;
    case "divider":
      return <DividerBlock block={block} />;
    case "file":
      return <FileBlock block={block} env={env} />;
    case "discount_code":
      return <DiscountCodeBlock block={block} />;
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
    default:
      // unknown type from a newer API: skip rather than crash the page
      return null;
  }
}

export function BlockList({ blocks, childrenOf, opts }: { blocks: Block[]; childrenOf: Map<string, Block[]>; opts: RenderOpts }) {
  return (
    <>
      {groupBlocks(blocks).map((it) =>
        it.kind === "group" ? (
          <LinkGroup key={`g-${it.blocks[0].id}`} layout={it.layout} blocks={it.blocks} env={opts.env} />
        ) : (
          <BlockRenderer key={it.block.id} block={it.block} childBlocks={childrenOf.get(it.block.id)} opts={opts} />
        ),
      )}
    </>
  );
}
