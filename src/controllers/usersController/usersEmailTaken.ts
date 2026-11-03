import { NextFunction, Request, Response } from "express";
import userGetEmailPrisma from "../../utils/db/user/userGetEmailPrisma";

/**
 * Responds with whether an email is already registered, for sign-up forms.
 * @param req Request with the email in the query
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function usersEmailTaken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { email } = req.query;
  if (typeof email != "string" || !email)
    return res.status(400).json({ errors: { query: ["email is required"] } });
  try {
    const user = await userGetEmailPrisma(email);
    return res.json({ taken: Boolean(user) });
  } catch (error) {
    return next(error);
  }
}
