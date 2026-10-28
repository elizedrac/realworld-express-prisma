import { api, createArticle, registerUser } from "./helpers";

describe("articlesCount", () => {
  test("is the total number of matches, independent of the page", async () => {
    const alice = await registerUser("alice");
    for (let i = 0; i < 12; i++) {
      await createArticle(alice, { title: `Article ${i}` });
    }

    const all = await api.get("/api/articles").expect(200);
    expect(all.body.articles).toHaveLength(12);
    expect(all.body.articlesCount).toBe(12);

    const page = await api.get("/api/articles?limit=5&offset=10").expect(200);
    expect(page.body.articles).toHaveLength(2);
    expect(page.body.articlesCount).toBe(12);
  });
});
