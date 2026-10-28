import { api, createArticle, registerUser } from "./helpers";

describe("article views", () => {
  test("counts each read of the article", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Popular" });

    await api.get("/api/articles/popular").expect(200);
    await api.get("/api/articles/popular").expect(200);

    const res = await api.get("/api/articles/popular/stats").expect(200);
    expect(res.body).toEqual({ stats: { views: 2 } });
  });

  test("stats return 404 for an unknown article", async () => {
    await api.get("/api/articles/nope/stats").expect(404);
  });
});
