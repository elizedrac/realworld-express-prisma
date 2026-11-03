import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/tags/:tag/count", () => {
  test("counts the articles with the tag", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "One", tagList: ["x", "y"] });
    await createArticle(alice, { title: "Two", tagList: ["x"] });

    expect((await api.get("/api/tags/x/count").expect(200)).body).toEqual({
      tag: "x",
      count: 2,
    });
    expect((await api.get("/api/tags/z/count").expect(200)).body).toEqual({
      tag: "z",
      count: 0,
    });
  });
});
