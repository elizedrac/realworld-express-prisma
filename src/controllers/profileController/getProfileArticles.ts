import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import articlesListPrisma from "../../utils/db/article/articleListPrisma";
import userGetPrisma from "../../utils/db/user/userGetPrisma";
import articleViewer from "../../view/articleViewer";

/**
 * Lists the articles written by a profile.
 * @param req Request with an optional jwt token verified
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function getProfileArticles(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { username } = req.params;
  const currentUsername = req.auth?.user?.username;

  try {
    const currentUser = await userGetPrisma(currentUsername);
    const profile = await userGetPrisma(username);
    if (!profile) return res.sendStatus(404);

    const articles = await articlesListPrisma(undefined, username);
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
