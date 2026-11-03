import { api, createArticle, createComment, registerUser } from "./helpers";

describe("GET /api/articles/:slug/comments/count", () => {
  test("counts the article's comments", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Talked" });
    await createArticle(alice, { title: "Quiet" });
    await createComment(alice, "talked", "one");
    await createComment(alice, "talked", "two");

    expect((await api.get("/api/articles/talked/comments/count")).body).toEqual(
      {
        count: 2,
      }
    );
    expect((await api.get("/api/articles/quiet/comments/count")).body).toEqual({
      count: 0,
    });
  });

  test("returns 404 for an unknown slug", async () => {
    await api.get("/api/articles/nope/comments/count").expect(404);
  });
});
