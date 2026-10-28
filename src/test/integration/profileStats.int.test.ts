import { api, auth, createArticle, registerUser } from "./helpers";

describe("GET /api/profiles/:username/stats", () => {
  test("counts articles, followers and follows", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "One" });
    await createArticle(alice, { title: "Two" });
    await api.post("/api/profiles/alice/follow").set(auth(bob)).expect(200);

    const res = await api.get("/api/profiles/alice/stats").expect(200);
    expect(res.body).toEqual({
      stats: { articlesCount: 2, followersCount: 1, followingCount: 0 },
    });
  });

  test("returns 404 for an unknown profile", async () => {
    await api.get("/api/profiles/nobody/stats").expect(404);
  });
});
