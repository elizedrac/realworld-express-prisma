import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import createUserToken from "../../utils/auth/createUserToken";
import userUpdatePrisma from "../../utils/db/user/userUpdatePrisma";
import userViewer from "../../view/userViewer";

/**
 * Sets only the current user's image, for the avatar picker.
 * The body must be { image }.
 * @param req Request with a jwt token verified
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function userSetImage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { image } = req.body ?? {};
  if (typeof image != "string")
    return res
      .status(400)
      .json({ errors: { body: ["image must be a string"] } });
  try {
    const user = await userUpdatePrisma(req.auth?.user?.username, { image });
    if (!user) return res.sendStatus(404);
    return res.json(userViewer(user, createUserToken(user)));
  } catch (error) {
    return next(error);
  }
}
