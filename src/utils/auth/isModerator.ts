import { Request } from "express-jwt";

/**
 * Whether the authenticated user is a moderator. Moderators are listed by
 * username in MODERATOR_USERNAMES (comma separated). The username comes from the token,
 * so no database lookup is needed.
 * @param req Request with a verified jwt token
 * @returns true if the user may moderate
 */
export default function isModerator(req: Request) {
  const username = req.auth?.user?.username;
  if (!username) return false;
  const moderators = (process.env.MODERATOR_USERNAMES ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return moderators.includes(username.toLowerCase());
}
