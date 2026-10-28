import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/articles?search=", () => {
  test("matches the title or body, case-insensitively", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Dragon Training", body: "Patience" });
    await createArticle(alice, { title: "Cooking", body: "Feed your DRAGON" });
    await createArticle(alice, { title: "Gardening", body: "Water daily" });

    const res = await api.get("/api/articles?search=dragon").expect(200);
    const slugs = res.body.articles.map((a: { slug: string }) => a.slug).sort();
    expect(slugs).toEqual(["cooking", "dragon-training"]);
  });

  test("combines with other filters", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Alice on dragons" });
    await createArticle(bob, { title: "Bob on dragons" });

    const res = await api
      .get("/api/articles?search=dragons&author=bob")
      .expect(200);
    expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
      "bob-on-dragons",
    ]);
  });

  // Validation errors are returned with status 200, like the other list filters.
  test("rejects a repeated search parameter", async () => {
    const res = await api.get("/api/articles?search=a&search=b").expect(200);
    expect(res.body.errors.query).toEqual(["search must be a string"]);
  });
});
