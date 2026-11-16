"use client";

import type { Block } from "@/lib/types";
import { groupBlocks } from "@/lib/page-structure";
import { LinkBlock, LinkGroup } from "./blocks/LinkBlock";
import { ImageBlock, MusicBlock, TextBlock, VideoBlock } from "./blocks/MediaBlocks";
import { SocialIconsBlock } from "./blocks/SocialIconsBlock";
import { FaqBlock, FolderBlock, TestimonialBlock } from "./blocks/DisclosureBlocks";
import { ContactFormBlock } from "./blocks/ContactFormBlock";
import { BookingBlock, CountdownBlock, DiscountCodeBlock, DividerBlock, FileBlock, HeadingBlock, QuoteBlock } from "./blocks/P2Blocks";
import { EmailSignupBlock, FormBlock } from "./blocks/FormBlocks";

export function BlockRenderer({ block, childBlocks = [] }: { block: Block; childBlocks?: Block[] }) {
  switch (block.type) {
    case "link":
      return <LinkBlock block={block} />;
    case "text":
      return <TextBlock block={block} />;
    case "image":
      return <ImageBlock block={block} />;
    case "video":
      return <VideoBlock block={block} />;
    case "music":
      return <MusicBlock block={block} />;
    case "social_icons":
      return <SocialIconsBlock block={block} />;
    case "folder":
      return <FolderBlock block={block}>{childBlocks}</FolderBlock>;
    case "faq":
      return <FaqBlock block={block} />;
    case "testimonial":
      return <TestimonialBlock block={block} />;
    case "contact_form":
      return <ContactFormBlock block={block} />;
    case "heading":
      return <HeadingBlock block={block} />;
    case "divider":
      return <DividerBlock block={block} />;
    case "file":
      return <FileBlock block={block} />;
    case "discount_code":
      return <DiscountCodeBlock block={block} />;
    case "countdown":
      return <CountdownBlock block={block} />;
    case "booking":
      return <BookingBlock block={block} />;
    case "quote":
      return <QuoteBlock block={block} />;
    case "email_signup":
      return <EmailSignupBlock block={block} />;
    case "form":
      return <FormBlock block={block} />;
    default:
      // unknown type from a newer API: skip rather than crash the page
      return null;
  }
}

export function BlockList({ blocks, childrenOf }: { blocks: Block[]; childrenOf: Map<string, Block[]> }) {
  return (
    <>
      {groupBlocks(blocks).map((it) =>
        it.kind === "group" ? (
          <LinkGroup key={`g-${it.blocks[0].id}`} layout={it.layout} blocks={it.blocks} />
        ) : (
          <BlockRenderer key={it.block.id} block={it.block} childBlocks={childrenOf.get(it.block.id)} />
        ),
      )}
    </>
  );
}
