import { Request, Response } from "express";
import prisma from "../../utils/db/prisma";

/**
 * Tags controller that responds with one tag and how many articles use it.
 * @param req Request with the tag name as a parameter
 * @param res Response
 * @returns void
 */
export default async function getTag(req: Request, res: Response) {
  const tag = await prisma.tag.findUnique({
    where: { tagName: req.params.tag },
    include: { _count: { select: { article: true } } },
  });
  if (!tag) return res.sendStatus(404);
  return res.json({
    tag: { name: tag.tagName, articlesCount: tag._count.article },
  });
}
