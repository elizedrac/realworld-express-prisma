import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/tags/:tag", () => {
  test("counts the articles with the tag", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "One", tagList: ["dragons"] });
    await createArticle(alice, { title: "Two", tagList: ["dragons"] });
    const res = await api.get("/api/tags/dragons").expect(200);
    expect(res.body.tag).toEqual({ name: "dragons", articlesCount: 2 });
  });

  test("is 404 for a tag nobody used", async () => {
    await api.get("/api/tags/nothing").expect(404);
  });
});
