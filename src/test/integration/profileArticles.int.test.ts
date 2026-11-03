import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/profiles/:username/articles", () => {
  test("lists only that user's articles", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "One" });
    await createArticle(alice, { title: "Two" });
    await createArticle(bob, { title: "Other" });

    const res = await api.get("/api/profiles/alice/articles").expect(200);
    expect(
      res.body.articles.map((a: { slug: string }) => a.slug).sort()
    ).toEqual(["one", "two"]);
    expect(res.body.articlesCount).toBe(2);
  });

  test("applies limit", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "One" });
    await createArticle(alice, { title: "Two" });
    const res = await api
      .get("/api/profiles/alice/articles?limit=1")
      .expect(200);
    expect(res.body.articles).toHaveLength(1);
  });

  test("returns 404 for an unknown user", async () => {
    await api.get("/api/profiles/nobody/articles").expect(404);
  });
});
