import { NextFunction, Request, Response } from "express";
import articleGetPrisma from "../../utils/db/article/articleGetPrisma";

/**
 * Returns read statistics for an article.
 * @param req Request
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function articlesStats(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const article = await articleGetPrisma(req.params.slug);
    if (!article) return res.sendStatus(404);
    return res.json({ stats: { views: article.views } });
  } catch (error) {
    return next(error);
  }
}
