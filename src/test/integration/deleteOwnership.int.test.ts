import { api, auth, createArticle, registerUser } from "./helpers";

test("only the author can delete an article", async () => {
  const alice = await registerUser("alice");
  const bob = await registerUser("bob");
  await createArticle(alice, { title: "Mine" });

  await api.delete("/api/articles/mine").set(auth(bob)).expect(403);
  await api.get("/api/articles/mine").expect(200);
  await api.delete("/api/articles/mine").set(auth(alice)).expect(200);
});
