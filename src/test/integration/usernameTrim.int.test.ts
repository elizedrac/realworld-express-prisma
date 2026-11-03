import { api } from "./helpers";

describe("POST /api/users username", () => {
  test("trims surrounding spaces", async () => {
    const res = await api
      .post("/api/users")
      .send({
        user: { username: "  carol ", email: "carol@mail.com", password: "pw" },
      })
      .expect(201);
    expect(res.body.user.username).toBe("carol");
  });

  test("treats a padded username as a duplicate", async () => {
    await api
      .post("/api/users")
      .send({
        user: { username: "carol", email: "carol@mail.com", password: "pw" },
      })
      .expect(201);
    await api
      .post("/api/users")
      .send({
        user: { username: " carol", email: "other@mail.com", password: "pw" },
      })
      .expect(422);
  });
});
