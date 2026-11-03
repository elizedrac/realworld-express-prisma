import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import articlesListPrisma from "../../utils/db/article/articleListPrisma";
import userGetPrisma from "../../utils/db/user/userGetPrisma";
import articleViewer from "../../view/articleViewer";

/**
 * Responds with the articles the current user has favorited.
 * @param req Request with a jwt token verified
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function userFavorites(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const currentUser = await userGetPrisma(req.auth?.user?.username);
    if (!currentUser) return res.sendStatus(401);
    const articles = await articlesListPrisma(
      undefined,
      undefined,
      currentUser.username
    );
    const articlesView = articles.map((article) =>
      articleViewer(article, currentUser)
    );
    return res.json({
      articles: articlesView,
      articlesCount: articlesView.length,
    });
  } catch (error) {
    return next(error);
  }
}
