import { api, auth, registerUser } from "./helpers";

describe("POST /api/user/confirm-password", () => {
  test("is 204 for the right password", async () => {
    const alice = await registerUser("alice");
    await api
      .post("/api/user/confirm-password")
      .set(auth(alice))
      .send({ user: { password: alice.password } })
      .expect(204);
  });

  test("is 403 for a wrong password", async () => {
    const alice = await registerUser("alice");
    await api
      .post("/api/user/confirm-password")
      .set(auth(alice))
      .send({ user: { password: "wrong" } })
      .expect(403);
  });

  test("is 400 without a password", async () => {
    const alice = await registerUser("alice");
    await api
      .post("/api/user/confirm-password")
      .set(auth(alice))
      .send({ user: {} })
      .expect(400);
  });

  test("needs a token", async () => {
    await api
      .post("/api/user/confirm-password")
      .send({ user: { password: "x" } })
      .expect(401);
  });
});
