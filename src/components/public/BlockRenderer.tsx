"use client";

import type { Block } from "@/lib/types";
import { LinkBlock } from "./blocks/LinkBlock";
import { ImageBlock, MusicBlock, TextBlock, VideoBlock } from "./blocks/MediaBlocks";
import { SocialIconsBlock } from "./blocks/SocialIconsBlock";
import { FaqBlock, FolderBlock, TestimonialBlock } from "./blocks/DisclosureBlocks";
import { ContactFormBlock } from "./blocks/ContactFormBlock";

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
    default:
      // unknown type from a newer API: skip rather than crash the page
      return null;
  }
}
