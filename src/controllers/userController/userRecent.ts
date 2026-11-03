import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import { recentArticlesPrisma } from "../../utils/db/article/recentViewsPrisma";
import userGetPrisma from "../../utils/db/user/userGetPrisma";
import articleViewer from "../../view/articleViewer";

/**
 * Responds with the articles the current user viewed most recently.
 * @param req Request with a jwt token verified
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function userRecent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const currentUser = await userGetPrisma(req.auth?.user?.username);
    if (!currentUser) return res.sendStatus(401);
    const articles = await recentArticlesPrisma(currentUser.username);
    return res.json({
      articles: articles.map((article) => articleViewer(article, currentUser)),
    });
  } catch (error) {
    return next(error);
  }
}
