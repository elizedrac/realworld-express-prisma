// Oracle for rw-029: an article the user viewed stays in their recent list after its title changes.
import { api, auth, createArticle, registerUser } from "../helpers";

test("recently viewed articles survive a title change", async () => {
  const alice = await registerUser("alice");
  const bob = await registerUser("bob");
  await createArticle(alice, { title: "Original" });
  await api.get("/api/articles/original").set(auth(bob)).expect(200);

  const updated = await api
    .put("/api/articles/original")
    .set(auth(alice))
    .send({ article: { title: "Renamed" } })
    .expect(200);

  const recent = await api.get("/api/user/recent").set(auth(bob)).expect(200);
  expect(recent.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
    updated.body.article.slug,
  ]);
});
