import { api, auth, createArticle, registerUser } from "./helpers";

test("a non-author gets 403 when deleting an article", async () => {
  const alice = await registerUser("alice");
  const bob = await registerUser("bob");
  await createArticle(alice, { title: "Keep Out" });

  await api.delete("/api/articles/keep-out").set(auth(bob)).expect(403);
  const res = await api.get("/api/articles/keep-out").expect(200);
  expect(res.body.article.author.username).toBe("alice");
});
