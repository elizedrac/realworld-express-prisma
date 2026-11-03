import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/articles?page=", () => {
  test("returns pages of 20 articles", async () => {
    const alice = await registerUser("alice");
    for (let i = 1; i <= 25; i++)
      await createArticle(alice, { title: `Article ${i}` });

    const first = await api.get("/api/articles?page=1").expect(200);
    expect(first.body.articles).toHaveLength(20);
    const second = await api.get("/api/articles?page=2").expect(200);
    expect(second.body.articles).toHaveLength(5);
  });

  test("rejects a page that is not a positive number", async () => {
    const res = await api.get("/api/articles?page=0").expect(200);
    expect(res.body.errors.query).toContain("page is not a valid page number");
  });
});
