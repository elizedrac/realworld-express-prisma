import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import userFollowProfilePrisma from "../../utils/db/user/userFollowProfilePrisma";
import userGetPrisma from "../../utils/db/user/userGetPrisma";
import profileViewer from "../../view/profileViewer";
import logger from "../../utils/logger";

/**
 * Profile controller that adds the username in the parameters to the current user followers list.
 * The parameters of the request must contain the username that will be followed by the authenticated user.
 * @param req Request with authenticated user in the auth property.
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function followProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.debug("followProfile");
  const username = req.params.username;
  const currentUsername = req.auth?.user?.username;
  try {
    // Get current user
    const currentUser = await userGetPrisma(currentUsername);
    if (!currentUser) return res.sendStatus(401);

    // Get the user profile to follow
    const profile = await userFollowProfilePrisma(currentUser, username);

    // Create the profile view.
    const profileView = profileViewer(profile, currentUser);

    return res.json({ profile: profileView });
  } catch (error) {
    logger.error("followProfile failed", { error: error });
    return next(error);
  }
}
