import type { Metadata, Viewport } from "next";
import { pageMetadata, pageViewport, renderPage } from "../../render";

// /alice?tab=shop is rewritten here by src/middleware.ts, so every tab is its own ISR page.
export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ username: string; tab: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username, tab } = await params;
  return pageMetadata(username, decodeURIComponent(tab));
}

export async function generateViewport({ params }: { params: Params }): Promise<Viewport> {
  return pageViewport((await params).username);
}

export default async function UsernameTabPage({ params }: { params: Params }) {
  const { username, tab } = await params;
  return renderPage(username, decodeURIComponent(tab));
}
