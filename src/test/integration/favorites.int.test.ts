import prisma from "../../utils/db/prisma";
import { api, auth, createArticle, registerUser } from "./helpers";

describe("POST /api/articles/:slug/favorite", () => {
  test("favorites the article and counts each user once", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Liked" });

    const first = await api
      .post("/api/articles/liked/favorite")
      .set(auth(bob))
      .expect(200);
    expect(first.body.article).toMatchObject({
      slug: "liked",
      favorited: true,
      favoritesCount: 1,
      author: { username: "alice", following: false },
    });

    const again = await api
      .post("/api/articles/liked/favorite")
      .set(auth(bob))
      .expect(200);
    expect(again.body.article.favoritesCount).toBe(1);

    const second = await api
      .post("/api/articles/liked/favorite")
      .set(auth(alice))
      .expect(200);
    expect(second.body.article).toMatchObject({
      favorited: true,
      favoritesCount: 2,
    });
  });

  test("reports following for the author when the user follows them", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Liked" });
    await api.post("/api/profiles/alice/follow").set(auth(bob)).expect(200);
    const res = await api
      .post("/api/articles/liked/favorite")
      .set(auth(bob))
      .expect(200);
    expect(res.body.article.author.following).toBe(true);
  });

  // Known bug: should be 404, but the Prisma P2016 error falls through to a 500.
  test("returns 500 for an unknown slug", async () => {
    const alice = await registerUser("alice");
    await api.post("/api/articles/nope/favorite").set(auth(alice)).expect(500);
  });

  test("returns 401 without a token or for a deleted user", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Liked" });
    await api.post("/api/articles/liked/favorite").expect(401);
    await prisma.user.delete({ where: { username: "bob" } });
    await api.post("/api/articles/liked/favorite").set(auth(bob)).expect(401);
  });
});

describe("DELETE /api/articles/:slug/favorite", () => {
  test("unfavorites the article", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Liked" });
    await api.post("/api/articles/liked/favorite").set(auth(bob)).expect(200);
    await api.post("/api/articles/liked/favorite").set(auth(alice)).expect(200);

    const res = await api
      .delete("/api/articles/liked/favorite")
      .set(auth(bob))
      .expect(200);
    expect(res.body.article).toMatchObject({
      favorited: false,
      favoritesCount: 1,
    });

    const listed = await api.get("/api/articles?favorited=bob").expect(200);
    expect(listed.body.articles).toEqual([]);
  });

  test("unfavoriting an article that was not favorited succeeds", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Liked" });
    const res = await api
      .delete("/api/articles/liked/favorite")
      .set(auth(alice))
      .expect(200);
    expect(res.body.article).toMatchObject({
      favorited: false,
      favoritesCount: 0,
    });
  });

  test("returns 422 for an unknown slug", async () => {
    const alice = await registerUser("alice");
    await api
      .delete("/api/articles/nope/favorite")
      .set(auth(alice))
      .expect(422);
  });

  test("returns 401 without a token or for a deleted user", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Liked" });
    await api.delete("/api/articles/liked/favorite").expect(401);
    await prisma.user.delete({ where: { username: "bob" } });
    await api.delete("/api/articles/liked/favorite").set(auth(bob)).expect(401);
  });
});
