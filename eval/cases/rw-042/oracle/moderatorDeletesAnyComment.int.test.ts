// Oracle for rw-042: a moderator listed by email can delete someone else's comment.
import { api, auth, createArticle, createComment, registerUser } from "../helpers";

test("a moderator deletes another user's comment", async () => {
  process.env.MODERATOR_EMAILS = "mod@mail.com";
  const alice = await registerUser("alice");
  const mod = await registerUser("mod");
  await createArticle(alice, { title: "Post" });
  const comment = await createComment(alice, "post", "spam");
  await api
    .delete(`/api/articles/post/comments/${comment.id}`)
    .set(auth(mod))
    .expect(200);
});
