import { NextFunction, Response } from "express";
import { Request as JWTRequest } from "express-jwt";
import articlesListPrisma from "../../utils/db/article/articleListPrisma";
import userGetPrisma from "../../utils/db/user/userGetPrisma";
import articleViewer from "../../view/articleViewer";

/**
 * Lists the articles written by the user in the parameters, newest update first.
 * @param req Request with an optional authenticated user and optional limit and offset
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function getProfileArticles(
  req: JWTRequest,
  res: Response,
  next: NextFunction
) {
  const { username } = req.params;
  const { limit, offset } = req.query;

  try {
    const profile = await userGetPrisma(username);
    if (!profile) return res.sendStatus(404);
    const currentUser = await userGetPrisma(req.auth?.user?.username);

    const articles = await articlesListPrisma(
      undefined,
      username,
      undefined,
      limit ? parseInt(limit as string) : undefined,
      offset ? parseInt(offset as string) : undefined
    );

    const articlesView = articles.map((article) =>
      currentUser ? articleViewer(article, currentUser) : articleViewer(article)
    );
    return res.json({
      articles: articlesView,
      articlesCount: articlesView.length,
    });
  } catch (error) {
    return next(error);
  }
}
