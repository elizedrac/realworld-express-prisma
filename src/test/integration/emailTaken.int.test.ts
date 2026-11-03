import { api, registerUser } from "./helpers";

describe("GET /api/users/email-taken", () => {
  test("reports whether the email is registered", async () => {
    await registerUser("alice");
    expect(
      (await api.get("/api/users/email-taken?email=alice@mail.com").expect(200))
        .body
    ).toEqual({ taken: true });
    expect(
      (await api.get("/api/users/email-taken?email=bob@mail.com").expect(200))
        .body
    ).toEqual({ taken: false });
  });

  test("requires an email", async () => {
    await api.get("/api/users/email-taken").expect(400);
  });
});
