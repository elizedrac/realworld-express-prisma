import { api, auth, createArticle, registerUser } from "./helpers";

test("the feed only lists followed authors", async () => {
  const alice = await registerUser("alice");
  const bob = await registerUser("bob");
  const carol = await registerUser("carol");
  await createArticle(bob, { title: "From Bob" });
  await createArticle(carol, { title: "From Carol" });
  await api.post("/api/profiles/bob/follow").set(auth(alice)).expect(200);

  const res = await api.get("/api/articles/feed").set(auth(alice)).expect(200);
  expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
    "from-bob",
  ]);
});
