import { api, auth, createArticle, registerUser } from "./helpers";

test("the feed skips authors the user does not follow", async () => {
  const alice = await registerUser("alice");
  const bob = await registerUser("bob");
  const carol = await registerUser("carol");
  await createArticle(bob, { title: "Bob Writes" });
  await createArticle(carol, { title: "Carol Writes" });
  await api.post("/api/profiles/bob/follow").set(auth(alice)).expect(200);

  const res = await api.get("/api/articles/feed").set(auth(alice)).expect(200);
  expect(
    res.body.articles.map(
      (a: { author: { username: string } }) => a.author.username
    )
  ).toEqual(["bob"]);
});
