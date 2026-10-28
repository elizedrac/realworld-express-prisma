import prisma from "../../utils/db/prisma";
import {
  api,
  auth,
  createArticle,
  createComment,
  registerUser,
} from "./helpers";

describe("POST /api/articles/:slug/comments", () => {
  test("creates the comment and returns its view", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Post" });
    const res = await api
      .post("/api/articles/post/comments")
      .set(auth(alice))
      .send({ comment: { body: "First!" } })
      .expect(201);
    expect(res.body).toEqual({
      comment: {
        id: expect.any(Number),
        body: "First!",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        author: { username: "alice", bio: null, image: null, following: false },
      },
    });
  });

  // Known bug: should be 404, but the foreign key error falls through to a 500.
  test("returns 500 for an unknown article", async () => {
    const alice = await registerUser("alice");
    await api
      .post("/api/articles/nope/comments")
      .set(auth(alice))
      .send({ comment: { body: "x" } })
      .expect(500);
  });

  test("rejects a missing comment, a non-object comment and a missing body", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Post" });
    const post = () => api.post("/api/articles/post/comments").set(auth(alice));

    const missing = await post().send({}).expect(400);
    expect(missing.body.errors.body).toEqual([
      "the body must contain a comment object",
    ]);

    const notObject = await post().send({ comment: "text" }).expect(400);
    expect(notObject.body.errors.body).toEqual([
      "the comment  must be an object",
    ]);

    const noBody = await post()
      .send({ comment: { body: 5 } })
      .expect(400);
    expect(noBody.body.errors.body).toEqual([
      "there must be a body string property in the comment object",
    ]);
  });

  test("returns 401 without a token or for a deleted user", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Post" });
    const comment = { comment: { body: "x" } };
    await api.post("/api/articles/post/comments").send(comment).expect(401);
    await prisma.user.delete({ where: { username: "bob" } });
    await api
      .post("/api/articles/post/comments")
      .set(auth(bob))
      .send(comment)
      .expect(401);
  });
});

describe("GET /api/articles/:slug/comments", () => {
  test("lists the article's comments only", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Post" });
    await createArticle(alice, { title: "Other" });
    await createComment(alice, "post", "one");
    await createComment(bob, "post", "two");
    await createComment(bob, "other", "elsewhere");

    const res = await api.get("/api/articles/post/comments").expect(200);
    const bodies = res.body.comments
      .map((c: { body: string }) => c.body)
      .sort();
    expect(bodies).toEqual(["one", "two"]);
  });

  test("marks following for the current user only", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Post" });
    await createComment(bob, "post", "hi");
    await api.post("/api/profiles/bob/follow").set(auth(alice)).expect(200);

    const asAlice = await api
      .get("/api/articles/post/comments")
      .set(auth(alice))
      .expect(200);
    expect(asAlice.body.comments[0].author).toMatchObject({
      username: "bob",
      following: true,
    });

    const anonymous = await api.get("/api/articles/post/comments").expect(200);
    expect(anonymous.body.comments[0].author.following).toBe(false);
  });

  // Known bug: should be 404 for an unknown article.
  test("returns an empty list for an unknown article", async () => {
    const res = await api.get("/api/articles/nope/comments").expect(200);
    expect(res.body).toEqual({ comments: [] });
  });
});

describe("DELETE /api/articles/:slug/comments/:id", () => {
  test("lets the author delete the comment", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Post" });
    const comment = await createComment(alice, "post", "oops");

    const res = await api
      .delete(`/api/articles/post/comments/${comment.id}`)
      .set(auth(alice))
      .expect(200);
    expect(res.body.comment).toMatchObject({ id: comment.id, body: "oops" });

    const after = await api.get("/api/articles/post/comments").expect(200);
    expect(after.body.comments).toEqual([]);
  });

  test("returns 422 when the user is not the comment's author", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Post" });
    const comment = await createComment(alice, "post", "mine");
    await api
      .delete(`/api/articles/post/comments/${comment.id}`)
      .set(auth(bob))
      .expect(422);
    expect(await prisma.comment.count()).toBe(1);
  });

  test("returns 422 for an unknown comment id", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Post" });
    await api
      .delete("/api/articles/post/comments/999")
      .set(auth(alice))
      .expect(422);
  });

  // Known bug: the slug in the URL is ignored when deleting.
  test("deletes the comment even when the slug belongs to another article", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Post" });
    await createArticle(alice, { title: "Other" });
    const comment = await createComment(alice, "post", "x");
    await api
      .delete(`/api/articles/other/comments/${comment.id}`)
      .set(auth(alice))
      .expect(200);
    expect(await prisma.comment.count()).toBe(0);
  });

  test("does not match a non-numeric id", async () => {
    const alice = await registerUser("alice");
    await api
      .delete("/api/articles/post/comments/abc")
      .set(auth(alice))
      .expect(404);
  });

  test("returns 401 without a token or for a deleted user", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    await createArticle(alice, { title: "Post" });
    const comment = await createComment(bob, "post", "x");
    await api.delete(`/api/articles/post/comments/${comment.id}`).expect(401);
    await prisma.user.delete({ where: { username: "bob" } });
    await api
      .delete(`/api/articles/post/comments/${comment.id}`)
      .set(auth(bob))
      .expect(401);
  });
});
