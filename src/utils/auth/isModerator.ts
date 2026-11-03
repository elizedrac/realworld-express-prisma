import { Request } from "express-jwt";

/**
 * Whether the authenticated user is a moderator. Moderators are listed by
 * email in MODERATOR_EMAILS (comma separated). The email comes from the token,
 * so no database lookup is needed.
 * @param req Request with a verified jwt token
 * @returns true if the user may moderate
 */
export default function isModerator(req: Request) {
  const email = req.auth?.user?.email;
  if (!email) return false;
  const moderators = (process.env.MODERATOR_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return moderators.includes(email.toLowerCase());
}
