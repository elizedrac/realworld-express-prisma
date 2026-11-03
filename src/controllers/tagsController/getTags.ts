import { Request, Response } from "express";
import prisma from "../../utils/db/prisma";
import tagViewer from "../../view/tagViewer";

const CACHE_TTL_MS = 60_000;
const WRITE_ACTIONS = [
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "executeRaw",
];

let cache: { tags: string[]; expiresAt: number } | null = null;

// Drop the cached list after any write to tags or articles.
prisma.$use(async (params, next) => {
  const result = await next(params);
  const relevant =
    params.model === "Tag" ||
    params.model === "Article" ||
    params.action === "executeRaw";
  if (relevant && WRITE_ACTIONS.includes(params.action)) cache = null;
  return result;
});

/**
 * Tags controller that responds with a list of all the tags on the system.
 * The list is cached for a minute.
 * @param _req
 * @param res
 * @returns
 */
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
