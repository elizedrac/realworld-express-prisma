import { NextFunction, Request, Response } from "express";
import createUserToken from "../../utils/auth/createUserToken";
import userCreatePrisma from "../../utils/db/user/userCreatePrisma";
import { hashPassword } from "../../utils/hashPasswords";
import normalizeEmail from "../../utils/normalizeEmail";
import userViewer from "../../view/userViewer";

/**
 * Registers a new user from the user object in the body of the request
 * and responds with the user view and an authentication token.
 * @param req Request
 * @param res Response
 * @param next NextFunction
 * @returns
 */
export default async function usersRegister(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { password, username } = req.body.user;
  const email = normalizeEmail(req.body.user.email);
  try {
    // Hash password
    const hashed = hashPassword(password);

    // Create the new user on the database
    const user = await userCreatePrisma(username, email, hashed);

    // Create the authentication token for future use
    const token = createUserToken(user);

    // Create the user view with the authentication token
    const userView = userViewer(user, token);

    return res.status(201).json(userView);
  } catch (error) {
    return next(error);
  }
}
