// Oracle for rw-052: the latest comment is the one posted last.
import { api, createArticle, createComment, registerUser } from "../helpers";

test("latest returns the newest of several comments", async () => {
  const alice = await registerUser("alice");
  await createArticle(alice, { title: "Post" });
  await createComment(alice, "post", "first");
  await createComment(alice, "post", "second");
  const res = await api.get("/api/articles/post/comments/latest").expect(200);
  expect(res.body.comment.body).toBe("second");
});
