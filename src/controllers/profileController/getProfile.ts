import { NextFunction, Response } from "express";
import { Request as JWTRequest } from "express-jwt";
import userGetPrisma from "../../utils/db/user/userGetPrisma";
import profileViewer from "../../view/profileViewer";
import logger from "../../utils/logger";

/**
 * Profile controller that takes the username in the parameters and returns its profile.
 * With an optional authenticated user.
 * @param req Request with an optional authenticated user.
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function getProfile(
  req: JWTRequest,
  res: Response,
  next: NextFunction
) {
  logger.debug("getProfile");
  const { username } = req.params;
  const currentUsername = req.auth?.user?.username; // The current user's username

  try {
    // Get current user from database
    const currentUser = await userGetPrisma(currentUsername);

    // Get the desired profile
    const profile = await userGetPrisma(username);
    if (!profile) return res.sendStatus(404);

    // Create the profile view
    const profileView = currentUser
      ? profileViewer(profile, currentUser)
      : profileViewer(profile);

    return res.json({ profile: profileView });
  } catch (error) {
    logger.error("getProfile failed", { error: error });
    return next(error);
  }
}
