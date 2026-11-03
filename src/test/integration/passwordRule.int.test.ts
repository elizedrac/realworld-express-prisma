import { api } from "./helpers";

describe("POST /api/users password rule", () => {
  test.each(["short1", "longbutnodigits"])("rejects %s", async (password) => {
    const res = await api
      .post("/api/users")
      .send({ user: { username: "alice", email: "alice@mail.com", password } })
      .expect(400);
    expect(res.body.errors.body).toEqual([
      "password must be at least 8 characters and contain a number",
    ]);
  });

  test("accepts a password with 8 characters and a number", async () => {
    await api
      .post("/api/users")
      .send({
        user: {
          username: "alice",
          email: "alice@mail.com",
          password: "abcdefg1",
        },
      })
      .expect(201);
  });
});
