import { Request, Response } from "express";
import prisma from "../../utils/db/prisma";

/**
 * Responds with every tag and how many articles use it, most used first.
 * @param _req Request
 * @param res Response
 * @returns void
 */
export default async function getTagCounts(_req: Request, res: Response) {
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { article: true } } },
  });
  const counts = tags
    .map((tag) => ({ tag: tag.tagName, count: tag._count.article }))
    .filter((entry) => entry.count > 0)
    .sort((x, y) => y.count - x.count || x.tag.localeCompare(y.tag));
  return res.json({ tags: counts });
}
