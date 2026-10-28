import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/profiles/:username/articles", () => {
  test("lists only that profile's articles", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Alice One" });
    await createArticle(alice, { title: "Alice Two" });
    await createArticle(bob, { title: "Bob One" });

    const res = await api.get("/api/profiles/alice/articles").expect(200);
    const slugs = res.body.articles.map((a: { slug: string }) => a.slug).sort();
    expect(slugs).toEqual(["alice-one", "alice-two"]);
    expect(res.body.articlesCount).toBe(2);
  });

  test("returns 404 for an unknown profile", async () => {
    await api.get("/api/profiles/nobody/articles").expect(404);
  });
});
