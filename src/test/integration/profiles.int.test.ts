import prisma from "../../utils/db/prisma";
import { api, auth, registerUser } from "./helpers";

describe("GET /api/profiles/:username", () => {
  test("returns the profile with following false for anonymous users", async () => {
    await registerUser("alice");
    const res = await api.get("/api/profiles/alice").expect(200);
    expect(res.body).toEqual({
      profile: { username: "alice", bio: null, image: null, following: false },
    });
  });

  test("reflects bio and image updates", async () => {
    const alice = await registerUser("alice");
    await api
      .put("/api/user")
      .set(auth(alice))
      .send({ user: { bio: "hi", image: "img" } })
      .expect(200);
    const res = await api.get("/api/profiles/alice").expect(200);
    expect(res.body.profile).toMatchObject({ bio: "hi", image: "img" });
  });

  test("returns 404 for an unknown user", async () => {
    await api.get("/api/profiles/nobody").expect(404);
  });

  test("shows following only to the user who follows", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    const carol = await registerUser("carol");
    await api.post("/api/profiles/bob/follow").set(auth(alice)).expect(200);

    const asAlice = await api
      .get("/api/profiles/bob")
      .set(auth(alice))
      .expect(200);
    expect(asAlice.body.profile.following).toBe(true);

    const asCarol = await api
      .get("/api/profiles/bob")
      .set(auth(carol))
      .expect(200);
    expect(asCarol.body.profile.following).toBe(false);

    const asAnonymous = await api.get("/api/profiles/bob").expect(200);
    expect(asAnonymous.body.profile.following).toBe(false);

    const bobSelf = await api
      .get("/api/profiles/bob")
      .set(auth(bob))
      .expect(200);
    expect(bobSelf.body.profile.following).toBe(false);
  });
});

describe("POST /api/profiles/:username/follow", () => {
  test("follows the user and returns the profile with following true", async () => {
    const alice = await registerUser("alice");
    await registerUser("bob");
    const res = await api
      .post("/api/profiles/bob/follow")
      .set(auth(alice))
      .expect(200);
    expect(res.body).toEqual({
      profile: { username: "bob", bio: null, image: null, following: true },
    });

    const stored = await prisma.user.findUniqueOrThrow({
      where: { username: "alice" },
      include: { follows: true },
    });
    expect(stored.follows.map((u) => u.username)).toEqual(["bob"]);
  });

  test("following twice is idempotent", async () => {
    const alice = await registerUser("alice");
    await registerUser("bob");
    await api.post("/api/profiles/bob/follow").set(auth(alice)).expect(200);
    const res = await api
      .post("/api/profiles/bob/follow")
      .set(auth(alice))
      .expect(200);
    expect(res.body.profile.following).toBe(true);
  });

  // Known bug: should be 404, but the Prisma P2016 error falls through to a 500.
  test("returns 500 for an unknown user", async () => {
    const alice = await registerUser("alice");
    await api.post("/api/profiles/nobody/follow").set(auth(alice)).expect(500);
  });

  test("returns 401 without a token or for a deleted user", async () => {
    const alice = await registerUser("alice");
    await registerUser("bob");
    await api.post("/api/profiles/bob/follow").expect(401);
    await prisma.user.delete({ where: { username: "alice" } });
    await api.post("/api/profiles/bob/follow").set(auth(alice)).expect(401);
  });
});

describe("DELETE /api/profiles/:username/follow", () => {
  test("unfollows the user and returns the profile with following false", async () => {
    const alice = await registerUser("alice");
    await registerUser("bob");
    await api.post("/api/profiles/bob/follow").set(auth(alice)).expect(200);
    const res = await api
      .delete("/api/profiles/bob/follow")
      .set(auth(alice))
      .expect(200);
    expect(res.body.profile).toMatchObject({
      username: "bob",
      following: false,
    });

    const after = await api
      .get("/api/profiles/bob")
      .set(auth(alice))
      .expect(200);
    expect(after.body.profile.following).toBe(false);
  });

  test("unfollowing someone not followed succeeds", async () => {
    const alice = await registerUser("alice");
    await registerUser("bob");
    const res = await api
      .delete("/api/profiles/bob/follow")
      .set(auth(alice))
      .expect(200);
    expect(res.body.profile.following).toBe(false);
  });

  // Known bug: should be 404, and is inconsistent with follow's 500.
  test("returns 422 for an unknown user", async () => {
    const alice = await registerUser("alice");
    await api
      .delete("/api/profiles/nobody/follow")
      .set(auth(alice))
      .expect(422);
  });

  test("returns 401 without a token or for a deleted user", async () => {
    const alice = await registerUser("alice");
    await registerUser("bob");
    await api.delete("/api/profiles/bob/follow").expect(401);
    await prisma.user.delete({ where: { username: "alice" } });
    await api.delete("/api/profiles/bob/follow").set(auth(alice)).expect(401);
  });
});
