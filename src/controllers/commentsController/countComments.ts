import { NextFunction, Request, Response } from "express";
import prisma from "../../utils/db/prisma";

/**
 * Responds with the number of comments on the article in the parameters.
 * @param req Request with the article slug in the parameters
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function countComments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const slug = req.params.slug;
  try {
    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article) return res.sendStatus(404);
    const count = await prisma.comment.count({ where: { articleSlug: slug } });
    return res.json({ count });
  } catch (error) {
    return next(error);
  }
}
