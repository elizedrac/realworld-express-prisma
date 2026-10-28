import prisma from "../../utils/db/prisma";
import {
  api,
  auth,
  createArticle,
  createComment,
  registerUser,
} from "./helpers";

/**
 * Pins updatedAt so list ordering does not depend on request timing.
 * @param slugs article slugs, oldest first
 */
async function setUpdateOrder(slugs: string[]) {
  for (const [index, slug] of slugs.entries()) {
    await prisma.article.update({
      where: { slug },
      data: { updatedAt: new Date(Date.UTC(2024, 0, index + 1)) },
    });
  }
}

describe("POST /api/articles", () => {
  test("creates the article and returns its full view", async () => {
    const alice = await registerUser("alice");
    const res = await api
      .post("/api/articles")
      .set(auth(alice))
      .send({
        article: {
          title: "How to Train Your Dragon",
          description: "Ever wonder how?",
          body: "You have to believe",
          tagList: ["training", "dragons"],
        },
      })
      .expect(201);

    expect(res.body).toEqual({
      article: {
        slug: "how-to-train-your-dragon",
        title: "How to Train Your Dragon",
        description: "Ever wonder how?",
        body: "You have to believe",
        tagList: ["dragons", "training"],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        favorited: false,
        favoritesCount: 0,
        author: { username: "alice", bio: null, image: null, following: false },
      },
    });
  });

  test("derives a URL-safe slug from accented and punctuated titles", async () => {
    const alice = await registerUser("alice");
    const article = await createArticle(alice, {
      title: "  Héllo, Wörld!  It's_me ",
    });
    expect(article.slug).toBe("hello-world-its-me");
  });

  test("works with no tagList or an empty one", async () => {
    const alice = await registerUser("alice");
    const without = await createArticle(alice, { title: "No tags" });
    const empty = await createArticle(alice, {
      title: "Empty tags",
      tagList: [],
    });
    expect(without.tagList).toEqual([]);
    expect(empty.tagList).toEqual([]);
  });

  test("reuses existing tags instead of duplicating them", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "One", tagList: ["shared", "a"] });
    await createArticle(alice, { title: "Two", tagList: ["shared", "b"] });
    expect(await prisma.tag.count()).toBe(3);
  });

  test("rejects a title whose slug already exists with 422", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Same Title" });
    const res = await api
      .post("/api/articles")
      .set(auth(bob))
      .send({ article: { title: "Same Title", description: "d", body: "b" } })
      .expect(422);
    expect(res.body.errors[0]).toMatch(/not unique/);
  });

  test("rejects a missing article object", async () => {
    const alice = await registerUser("alice");
    const res = await api
      .post("/api/articles")
      .set(auth(alice))
      .send({})
      .expect(400);
    expect(res.body.errors.body).toEqual([
      "article must be an object inside body",
    ]);
  });

  test("reports each empty required field and a bad tagList", async () => {
    const alice = await registerUser("alice");
    const res = await api
      .post("/api/articles")
      .set(auth(alice))
      .send({ article: { title: "", description: 5, tagList: "nope" } })
      .expect(400);
    expect(res.body.errors.body).toEqual([
      "title field must be a non-empty string",
      "description field must be a non-empty string",
      "body field must be a non-empty string",
      "tagList must be an array of non-empty strings",
    ]);

    const emptyTag = await api
      .post("/api/articles")
      .set(auth(alice))
      .send({
        article: {
          title: "t",
          description: "d",
          body: "b",
          tagList: ["ok", ""],
        },
      })
      .expect(400);
    expect(emptyTag.body.errors.body).toEqual([
      "tagList must be an array of non-empty strings",
    ]);
  });

  test("returns 401 without a token or for a deleted user", async () => {
    const alice = await registerUser("alice");
    const article = { article: { title: "t", description: "d", body: "b" } };
    await api.post("/api/articles").send(article).expect(401);
    await prisma.user.delete({ where: { username: "alice" } });
    await api.post("/api/articles").set(auth(alice)).send(article).expect(401);
  });
});

describe("GET /api/articles/:slug", () => {
  test("returns the article for anonymous users", async () => {
    const alice = await registerUser("alice");
    const created = await createArticle(alice, {
      title: "Readable",
      tagList: ["x"],
    });
    const res = await api.get(`/api/articles/${created.slug}`).expect(200);
    expect(res.body.article).toEqual(created);
  });

  test("reflects favorited and following for the current user", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    const created = await createArticle(alice, { title: "Popular" });
    await api
      .post(`/api/articles/${created.slug}/favorite`)
      .set(auth(bob))
      .expect(200);
    await api.post("/api/profiles/alice/follow").set(auth(bob)).expect(200);

    const asBob = await api
      .get(`/api/articles/${created.slug}`)
      .set(auth(bob))
      .expect(200);
    expect(asBob.body.article).toMatchObject({
      favorited: true,
      favoritesCount: 1,
      author: { username: "alice", following: true },
    });

    const asAlice = await api
      .get(`/api/articles/${created.slug}`)
      .set(auth(alice))
      .expect(200);
    expect(asAlice.body.article).toMatchObject({
      favorited: false,
      favoritesCount: 1,
      author: { following: false },
    });
  });

  test("returns 404 for an unknown slug", async () => {
    await api.get("/api/articles/does-not-exist").expect(404);
  });
});

describe("GET /api/articles", () => {
  test("lists articles newest update first", async () => {
    const alice = await registerUser("alice");
    for (const title of ["First", "Second", "Third"]) {
      await createArticle(alice, { title });
    }
    await setUpdateOrder(["first", "second", "third"]);

    const res = await api.get("/api/articles").expect(200);
    expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
      "third",
      "second",
      "first",
    ]);
    expect(res.body.articlesCount).toBe(3);
  });

  test("returns an empty list when there are no articles", async () => {
    const res = await api.get("/api/articles").expect(200);
    expect(res.body).toEqual({ articles: [], articlesCount: 0 });
  });

  test("filters by tag, author and favorited user", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Alice Tagged", tagList: ["dragons"] });
    await createArticle(alice, { title: "Alice Plain" });
    await createArticle(bob, { title: "Bob Tagged", tagList: ["dragons"] });
    await api
      .post("/api/articles/alice-plain/favorite")
      .set(auth(bob))
      .expect(200);

    const slugs = (res: { body: { articles: { slug: string }[] } }) =>
      res.body.articles.map((a) => a.slug).sort();

    expect(
      slugs(await api.get("/api/articles?tag=dragons").expect(200))
    ).toEqual(["alice-tagged", "bob-tagged"]);
    expect(
      slugs(await api.get("/api/articles?author=alice").expect(200))
    ).toEqual(["alice-plain", "alice-tagged"]);
    expect(
      slugs(await api.get("/api/articles?favorited=bob").expect(200))
    ).toEqual(["alice-plain"]);
    expect(
      slugs(await api.get("/api/articles?tag=dragons&author=bob").expect(200))
    ).toEqual(["bob-tagged"]);
    expect(
      slugs(await api.get("/api/articles?author=nobody").expect(200))
    ).toEqual([]);
  });

  // Known bug: articlesCount is the size of the returned page, not the total number of matches.
  test("paginates with limit and offset", async () => {
    const alice = await registerUser("alice");
    for (const title of ["A1", "A2", "A3", "A4"]) {
      await createArticle(alice, { title });
    }
    await setUpdateOrder(["a1", "a2", "a3", "a4"]);

    const res = await api.get("/api/articles?limit=2&offset=1").expect(200);
    expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
      "a3",
      "a2",
    ]);
    expect(res.body.articlesCount).toBe(2);
  });

  test("marks favorited per current user", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Liked" });
    await api.post("/api/articles/liked/favorite").set(auth(bob)).expect(200);

    const asBob = await api.get("/api/articles").set(auth(bob)).expect(200);
    expect(asBob.body.articles[0]).toMatchObject({
      favorited: true,
      favoritesCount: 1,
    });

    const anonymous = await api.get("/api/articles").expect(200);
    expect(anonymous.body.articles[0]).toMatchObject({
      favorited: false,
      favoritesCount: 1,
    });
  });

  // Known bug: validation errors come back with status 200 instead of 400.
  test("returns query errors with status 200", async () => {
    const res = await api
      .get(
        "/api/articles?limit=abc&offset=xyz&tag=a&tag=b&author=a&author=b&favorited=a&favorited=b"
      )
      .expect(200);
    expect(res.body.errors.query).toEqual([
      "author must be a string",
      "tag must be a string",
      "favorited must be a string",
      "limit is not a valid number",
      "offset is not a valid number",
    ]);

    const arrays = await api
      .get("/api/articles?limit=1&limit=2&offset=1&offset=2")
      .expect(200);
    expect(arrays.body.errors.query).toEqual([
      "limit must be a string",
      "offset must be a string",
    ]);
  });
});

describe("GET /api/articles/feed", () => {
  // Known bug: the feed is not filtered to followed authors, it returns every article.
  test("returns articles from all authors, not only followed ones", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    const carol = await registerUser("carol");
    await createArticle(bob, { title: "From Bob" });
    await createArticle(carol, { title: "From Carol" });
    await api.post("/api/profiles/bob/follow").set(auth(alice)).expect(200);

    const res = await api
      .get("/api/articles/feed")
      .set(auth(alice))
      .expect(200);
    const bySlug = Object.fromEntries(
      res.body.articles.map(
        (a: { slug: string; author: { following: boolean } }) => [
          a.slug,
          a.author.following,
        ]
      )
    );
    expect(bySlug).toEqual({ "from-bob": true, "from-carol": false });
    expect(res.body.articlesCount).toBe(2);
  });

  test("applies limit and offset", async () => {
    const alice = await registerUser("alice");
    for (const title of ["F1", "F2", "F3"]) {
      await createArticle(alice, { title });
    }
    const res = await api
      .get("/api/articles/feed?limit=1&offset=1")
      .set(auth(alice))
      .expect(200);
    expect(res.body.articles).toHaveLength(1);
  });

  // Known bug: validation errors come back with status 200 instead of 400.
  test("returns query errors with status 200", async () => {
    const alice = await registerUser("alice");
    const res = await api
      .get("/api/articles/feed?limit=abc&offset=xyz")
      .set(auth(alice))
      .expect(200);
    expect(res.body.errors.query).toEqual([
      "limit is not a valid number",
      "offset is not a valid number",
    ]);

    const arrays = await api
      .get("/api/articles/feed?limit=1&limit=2&offset=1&offset=2")
      .set(auth(alice))
      .expect(200);
    expect(arrays.body.errors.query).toEqual([
      "limit must be a string",
      "offset must be a string",
    ]);
  });

  test("returns 401 without a token or for a deleted user", async () => {
    const alice = await registerUser("alice");
    await api.get("/api/articles/feed").expect(401);
    await prisma.user.delete({ where: { username: "alice" } });
    await api.get("/api/articles/feed").set(auth(alice)).expect(401);
  });
});

describe("PUT /api/articles/:slug", () => {
  test("updates the given fields and bumps updatedAt", async () => {
    const alice = await registerUser("alice");
    const created = await createArticle(alice, {
      title: "Original",
      tagList: ["t"],
    });
    const res = await api
      .put("/api/articles/original")
      .set(auth(alice))
      .send({ article: { body: "New body" } })
      .expect(200);

    expect(res.body.article).toMatchObject({
      slug: "original",
      title: "Original",
      description: created.description,
      body: "New body",
      tagList: ["t"],
    });
    expect(new Date(res.body.article.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.updatedAt).getTime()
    );
  });

  // Known bug: the slug is re-derived from the old slug, so renaming does not change it.
  test("keeps the old slug when the title changes", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Old Title" });
    const res = await api
      .put("/api/articles/old-title")
      .set(auth(alice))
      .send({ article: { title: "New Title" } })
      .expect(200);
    expect(res.body.article).toMatchObject({
      slug: "old-title",
      title: "New Title",
    });
    await api.get("/api/articles/new-title").expect(404);
  });

  // Known bug: there is no ownership check.
  test("lets a non-author update the article", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Mine" });
    const res = await api
      .put("/api/articles/mine")
      .set(auth(bob))
      .send({ article: { body: "Hijacked" } })
      .expect(200);
    expect(res.body.article).toMatchObject({
      body: "Hijacked",
      author: { username: "alice" },
    });
  });

  test("returns 422 for an unknown slug", async () => {
    const alice = await registerUser("alice");
    await api
      .put("/api/articles/nope")
      .set(auth(alice))
      .send({ article: { body: "x" } })
      .expect(422);
  });

  test("rejects a missing article or non-string fields", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Target" });
    const missing = await api
      .put("/api/articles/target")
      .set(auth(alice))
      .send({})
      .expect(400);
    expect(missing.body.errors.body).toEqual([
      "article must be an object inside body",
    ]);

    const wrongTypes = await api
      .put("/api/articles/target")
      .set(auth(alice))
      .send({ article: { title: 1, description: 2, body: 3 } })
      .expect(400);
    expect(wrongTypes.body.errors.body).toEqual([
      "title must be a string",
      "description must be a string",
      "body must be a string",
    ]);
  });

  test("returns 401 without a token or for a deleted user", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Target" });
    const update = { article: { body: "x" } };
    await api.put("/api/articles/target").send(update).expect(401);
    await prisma.user.delete({ where: { username: "bob" } });
    await api
      .put("/api/articles/target")
      .set(auth(bob))
      .send(update)
      .expect(401);
  });
});

describe("DELETE /api/articles/:slug", () => {
  test("deletes the article and its comments and returns the deleted view", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Doomed" });
    await createComment(alice, "doomed", "bye");

    const res = await api
      .delete("/api/articles/doomed")
      .set(auth(alice))
      .expect(200);
    expect(res.body.article).toMatchObject({ slug: "doomed", title: "Doomed" });

    await api.get("/api/articles/doomed").expect(404);
    expect(await prisma.comment.count()).toBe(0);
  });

  test("returns 422 for an unknown slug", async () => {
    const alice = await registerUser("alice");
    await api.delete("/api/articles/nope").set(auth(alice)).expect(422);
  });

  test("returns 401 without a token or for a deleted user", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Target" });
    await api.delete("/api/articles/target").expect(401);
    await prisma.user.delete({ where: { username: "bob" } });
    await api.delete("/api/articles/target").set(auth(bob)).expect(401);
  });
});
