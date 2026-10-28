import { Request, Response } from "express";
import prisma from "../../utils/db/prisma";
import tagViewer from "../../view/tagViewer";

const CACHE_TTL_MS = 60_000;
let cache: { tags: string[]; expiresAt: number } | null = null;

/**
 * Drops the cached tag list. Call it whenever tags are added.
 */
export function invalidateTagsCache() {
  cache = null;
}

export default async function getTags(_req: Request, res: Response) {
  if (!cache || cache.expiresAt < Date.now()) {
    // Get all the tags
    const tags = await prisma.tag.findMany();
    cache = {
      tags: tags.map((tag) => tagViewer(tag)),
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
  }

  return res.json({ tags: cache.tags });
}
