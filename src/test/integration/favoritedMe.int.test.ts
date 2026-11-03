import { api, auth, createArticle, registerUser } from "./helpers";

describe("GET /api/articles?favorited=me", () => {
  test("lists the current user's favorites", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Liked" });
    await createArticle(alice, { title: "Ignored" });
    await api.post("/api/articles/liked/favorite").set(auth(bob)).expect(200);

    const res = await api
      .get("/api/articles?favorited=me")
      .set(auth(bob))
      .expect(200);
    expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
      "liked",
    ]);
  });

  test("requires a token for me", async () => {
    await api.get("/api/articles?favorited=me").expect(401);
  });
});
