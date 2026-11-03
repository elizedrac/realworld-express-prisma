import { api, auth, createArticle, registerUser } from "./helpers";

describe("GET /api/user/recent", () => {
  test("lists articles the user viewed, newest first", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "First" });
    await createArticle(alice, { title: "Second" });

    await api.get("/api/articles/first").set(auth(bob)).expect(200);
    await api.get("/api/articles/second").set(auth(bob)).expect(200);
    await api.get("/api/articles/first").expect(200);

    const res = await api.get("/api/user/recent").set(auth(bob)).expect(200);
    expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
      "second",
      "first",
    ]);
  });

  test("requires a token", async () => {
    await api.get("/api/user/recent").expect(401);
  });
});
