import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import commentsGetPrisma from "../../utils/db/comment/commentsGetPrisma";
import userGetPrisma from "../../utils/db/user/userGetPrisma";
import commentViewer from "../../view/commentViewer";

/**
 * Comment controller that responds with the most recent comment on an article.
 * @param req Request with the article slug and an optionally verified jwt token
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function latestComment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const slug = req.params.slug;
  const username = req.auth?.user?.username;

  try {
    const currentUser = await userGetPrisma(username);
    const comments = currentUser
      ? await commentsGetPrisma(slug, currentUser)
      : await commentsGetPrisma(slug);
    if (comments.length === 0) return res.sendStatus(404);

    // Comment ids only grow, so the highest is the latest.
    const latest = comments.reduce((a, c) => (c.id > a.id ? c : a));

    return res.json({
      comment: currentUser
        ? commentViewer(latest, currentUser)
        : commentViewer(latest),
    });
  } catch (error) {
    return next(error);
  }
}
