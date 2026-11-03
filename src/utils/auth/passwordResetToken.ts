import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const PURPOSE = "password-reset";

/**
 * Creates a short-lived token that lets the owner of an email reset its password.
 * @param email email of the user requesting the reset
 * @returns the reset token
 */
export function createPasswordResetToken(email: string) {
  if (!process.env.RESET_TOKEN_SECRET)
    throw new Error("RESET_TOKEN_SECRET missing in environment.");
  return jwt.sign({ purpose: PURPOSE, email }, process.env.RESET_TOKEN_SECRET, {
    expiresIn: "15m",
  });
}

/**
 * Verifies a password reset token.
 * @param token token received by the user
 * @returns the email the token was issued for, or null if the token is invalid or expired
 */
export function verifyPasswordResetToken(token: string) {
  if (!process.env.RESET_TOKEN_SECRET)
    throw new Error("RESET_TOKEN_SECRET missing in environment.");
  try {
    const payload = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
    if (typeof payload !== "object" || payload.purpose !== PURPOSE) return null;
    return payload.email as string;
  } catch {
    return null;
  }
}
