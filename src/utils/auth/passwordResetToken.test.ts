import jwt from "jsonwebtoken";
import {
  createPasswordResetToken,
  verifyPasswordResetToken,
} from "./passwordResetToken";

describe("password reset tokens", () => {
  test("round-trips the email", () => {
    const token = createPasswordResetToken("alice@mail.com");
    expect(verifyPasswordResetToken(token)).toBe("alice@mail.com");
  });

  test("rejects a tampered token", () => {
    const token = createPasswordResetToken("alice@mail.com");
    expect(verifyPasswordResetToken(`${token}x`)).toBeNull();
  });

  test("rejects a token without the reset purpose", () => {
    const loginToken = jwt.sign(
      { user: { username: "alice" } },
      process.env.RESET_TOKEN_SECRET as string
    );
    expect(verifyPasswordResetToken(loginToken)).toBeNull();
  });

  test("rejects an expired token", () => {
    const expired = jwt.sign(
      { purpose: "password-reset", email: "alice@mail.com" },
      process.env.RESET_TOKEN_SECRET as string,
      { expiresIn: -1 }
    );
    expect(verifyPasswordResetToken(expired)).toBeNull();
  });
});
