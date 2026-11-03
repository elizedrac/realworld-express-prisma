import { api, auth, createArticle, registerUser } from "./helpers";

test("rejects a comment over 1,000 characters", async () => {
  const alice = await registerUser("alice");
  await createArticle(alice, { title: "Hooks" });
  await api
    .post("/api/articles/hooks/comments")
    .set(auth(alice))
    .send({ comment: { body: "x".repeat(1_001) } })
    .expect(400);
});
