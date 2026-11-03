import { NextFunction, Request, Response } from "express";
import prisma from "../../utils/db/prisma";

/**
 * Responds with the number of articles that have the tag in the parameters.
 * @param req Request with the tag name in the parameters
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function countTagArticles(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { tag } = req.params;
  try {
    const count = await prisma.article.count({
      where: { tagList: { some: { tagName: tag } } },
    });
    return res.json({ tag, count });
  } catch (error) {
    return next(error);
  }
}
