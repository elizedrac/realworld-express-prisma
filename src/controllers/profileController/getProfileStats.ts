import { NextFunction, Request, Response } from "express";
import userGetPrisma from "../../utils/db/user/userGetPrisma";

/**
 * Returns article and follower counts for a profile.
 * @param req Request
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function getProfileStats(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await userGetPrisma(req.params.username);
    if (!user) return res.sendStatus(404);
    return res.json({
      stats: {
        articlesCount: user.authored.length,
        followersCount: user.followedBy.length,
        followingCount: user.follows.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}
