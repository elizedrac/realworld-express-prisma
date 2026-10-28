import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import articleGetPrisma from "../../utils/db/article/articleGetPrisma";
import userGetPrisma from "../../utils/db/user/userGetPrisma";

/**
 * Middleware that lets a request through only if the current user wrote the article in :slug.
 * Unknown users and unknown slugs are passed on so the controller can report them.
 * @param req Request with a jwt token verified
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function requireArticleAuthor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await userGetPrisma(req.auth?.user?.username);
    if (!user) return next();
    const article = await articleGetPrisma(req.params.slug);
    if (article && article.authorUsername !== user.username)
      return res.sendStatus(403);
    return next();
  } catch (error) {
    return next(error);
  }
}
