import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import userGetPrisma from "../../utils/db/user/userGetPrisma";
import userUpdatePrisma from "../../utils/db/user/userUpdatePrisma";
import { compareWithHash, hashPassword } from "../../utils/hashPasswords";

/**
 * Changes the current user's password after checking the current one.
 * The body must have { currentPassword, newPassword }.
 * @param req Request with a jwt token verified
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function userChangePassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const username = req.auth?.user?.username;
  const { currentPassword, newPassword } = req.body ?? {};
  if (
    typeof currentPassword != "string" ||
    typeof newPassword != "string" ||
    !newPassword
  )
    return res
      .status(400)
      .json({
        errors: { body: ["currentPassword and newPassword must be strings"] },
      });

  try {
    const user = await userGetPrisma(username);
    if (!user) return res.sendStatus(401);
    if (!compareWithHash(currentPassword, user.password))
      return res.sendStatus(403);

    await userUpdatePrisma(user.username, {
      password: hashPassword(newPassword),
    });
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
}
