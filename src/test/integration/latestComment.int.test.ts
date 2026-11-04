import { api, createArticle, createComment, registerUser } from "./helpers";

describe("GET /api/articles/:slug/comments/latest", () => {
  test("returns the comment", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Post" });
    await createComment(alice, "post", "first!");
    const res = await api.get("/api/articles/post/comments/latest").expect(200);
    expect(res.body.comment.body).toBe("first!");
  });

  test("is 404 when there are no comments", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Post" });
    await api.get("/api/articles/post/comments/latest").expect(404);
  });
});
