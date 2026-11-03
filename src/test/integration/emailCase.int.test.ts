import { api } from "./helpers";

describe("email normalization", () => {
  test("logs in regardless of email case and spaces", async () => {
    await api
      .post("/api/users")
      .send({
        user: { username: "alice", email: " Alice@Mail.com ", password: "pw" },
      })
      .expect(201);
    const res = await api
      .post("/api/users/login")
      .send({ user: { email: "ALICE@mail.com", password: "pw" } })
      .expect(200);
    expect(res.body.user.email).toBe("alice@mail.com");
  });
});
