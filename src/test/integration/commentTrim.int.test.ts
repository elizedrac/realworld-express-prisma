import { api, auth, createArticle, registerUser } from "./helpers";

test("comment bodies are stored trimmed", async () => {
  const alice = await registerUser("alice");
  await createArticle(alice, { title: "Hooks" });
  const res = await api
    .post("/api/articles/hooks/comments")
    .set(auth(alice))
    .send({ comment: { body: "  nice  " } })
    .expect(201);
  expect(res.body.comment.body).toBe("nice");
});
