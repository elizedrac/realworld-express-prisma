import { api, createArticle, registerUser } from "./helpers";

describe("tag normalization", () => {
  test("stores tags trimmed, lowercased and deduplicated", async () => {
    const alice = await registerUser("alice");
    const article = await createArticle(alice, {
      title: "Mixed Case",
      tagList: ["Dragons ", "dragons", " TRAINING"],
    });
    expect(article.tagList).toEqual(["dragons", "training"]);

    const tags = await api.get("/api/tags").expect(200);
    expect(tags.body.tags.sort()).toEqual(["dragons", "training"]);
  });

  test("reuses a tag regardless of the casing used", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "One", tagList: ["Dragons"] });
    await createArticle(alice, { title: "Two", tagList: ["dragons"] });

    const res = await api.get("/api/articles?tag=dragons").expect(200);
    expect(res.body.articlesCount).toBe(2);
  });
});
