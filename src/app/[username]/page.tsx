import type { Metadata, Viewport } from "next";
import { pageMetadata, pageViewport, renderPage } from "./render";

// ISR: rendered on first request, cached, refreshed in the background after 60 s, and purged at once
// by POST /api/revalidate (the backend's publish/edit webhook). ?tab= is rewritten by the
// middleware to /[username]/t/[tab], so this file never reads searchParams (which would force SSR).
export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return pageMetadata((await params).username, null);
}

export async function generateViewport({ params }: { params: Params }): Promise<Viewport> {
  return pageViewport((await params).username);
}

export default async function UsernamePage({ params }: { params: Params }) {
  return renderPage((await params).username, null);
}
