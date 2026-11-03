import { Request } from "express-jwt";
import isModerator from "./isModerator";

function request(user?: object) {
  return { auth: user ? { user } : undefined } as Request;
}

describe("isModerator", () => {
  const saved = process.env.MODERATOR_EMAILS;
  beforeEach(() => {
    process.env.MODERATOR_EMAILS = "mod@mail.com, other@mail.com";
  });
  afterAll(() => {
    process.env.MODERATOR_EMAILS = saved;
  });

  test("is true for a listed email, in any case", () => {
    expect(
      isModerator(request({ username: "mod", email: "mod@mail.com" }))
    ).toBe(true);
    expect(
      isModerator(request({ username: "MOD", email: "MOD@mail.com" }))
    ).toBe(true);
  });

  test("is false for anyone else", () => {
    expect(
      isModerator(request({ username: "alice", email: "alice@mail.com" }))
    ).toBe(false);
    expect(isModerator(request())).toBe(false);
  });

  test("is false when no moderators are configured", () => {
    delete process.env.MODERATOR_EMAILS;
    expect(
      isModerator(request({ username: "mod", email: "mod@mail.com" }))
    ).toBe(false);
  });
});
