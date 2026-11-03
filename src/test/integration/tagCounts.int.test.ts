import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/tags/counts", () => {
  test("counts articles per tag, most used first", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "One", tagList: ["x", "y"] });
    await createArticle(alice, { title: "Two", tagList: ["x"] });

    const res = await api.get("/api/tags/counts").expect(200);
    expect(res.body.tags).toEqual([
      { tag: "x", count: 2 },
      { tag: "y", count: 1 },
    ]);
  });
});
