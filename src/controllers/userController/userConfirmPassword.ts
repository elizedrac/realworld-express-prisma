import bcrypt from "bcrypt";
import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import userGetPrisma from "../../utils/db/user/userGetPrisma";

/**
 * User controller that checks the current user's password again before a
 * sensitive action. Responds 204 if it matches and 403 if not.
 * @param req Request with an authenticated user and body { user: { password } }
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function userConfirmPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const username = req.auth?.user?.username;
  const password = req.body?.user?.password;
  if (typeof password != "string" || !password)
    return res.status(400).json({ errors: { body: ["password is required"] } });
  try {
    const user = await userGetPrisma(username);
    if (!user) return res.sendStatus(404);
    // bcrypt directly: compareWithHash logs the password it is given.
    if (!bcrypt.compareSync(password, user.password))
      return res.sendStatus(403);
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
}
