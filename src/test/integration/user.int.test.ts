import jwt from "jsonwebtoken";
import prisma from "../../utils/db/prisma";
import { api, auth, registerUser } from "./helpers";

describe("GET /api/user", () => {
  test("returns the current user with a fresh token", async () => {
    const alice = await registerUser("alice");
    const res = await api.get("/api/user").set(auth(alice)).expect(200);
    expect(res.body).toEqual({
      user: {
        username: "alice",
        email: alice.email,
        bio: null,
        image: null,
        token: expect.any(String),
      },
    });
  });

  test("accepts the Bearer scheme as well as Token", async () => {
    const alice = await registerUser("alice");
    await api
      .get("/api/user")
      .set({ Authorization: `Bearer ${alice.token}` })
      .expect(200);
  });

  test("returns 401 without a token", async () => {
    await api.get("/api/user").expect(401);
  });

  test("returns 401 for an unknown scheme or malformed header", async () => {
    const alice = await registerUser("alice");
    await api
      .get("/api/user")
      .set({ Authorization: `Basic ${alice.token}` })
      .expect(401);
    await api
      .get("/api/user")
      .set({ Authorization: `Token ${alice.token} extra` })
      .expect(401);
  });

  test("returns 401 with an error body for an invalid token", async () => {
    const res = await api
      .get("/api/user")
      .set({ Authorization: "Token not.a.jwt" })
      .expect(401);
    expect(res.body).toEqual({
      errors: { header: ["authorization token is invalid"] },
    });
  });

  test("returns 401 for a token signed with another secret", async () => {
    const forged = jwt.sign(
      JSON.stringify({ user: { username: "alice", email: "a@mail.com" } }),
      "another-secret"
    );
    await api
      .get("/api/user")
      .set({ Authorization: `Token ${forged}` })
      .expect(401);
  });

  test("returns 404 when the token's user no longer exists", async () => {
    const alice = await registerUser("alice");
    await prisma.user.delete({ where: { username: "alice" } });
    await api.get("/api/user").set(auth(alice)).expect(404);
  });
});

describe("PUT /api/user", () => {
  test("updates bio and image and persists them", async () => {
    const alice = await registerUser("alice");
    const res = await api
      .put("/api/user")
      .set(auth(alice))
      .send({ user: { bio: "hello", image: "https://img/a.png" } })
      .expect(200);
    expect(res.body.user).toMatchObject({
      username: "alice",
      bio: "hello",
      image: "https://img/a.png",
    });

    const current = await api.get("/api/user").set(auth(alice)).expect(200);
    expect(current.body.user).toMatchObject({
      bio: "hello",
      image: "https://img/a.png",
    });
  });

  test("updating the email lets the user log in with the new email", async () => {
    const alice = await registerUser("alice");
    await api
      .put("/api/user")
      .set(auth(alice))
      .send({ user: { email: "new@mail.com" } })
      .expect(200);
    await api
      .post("/api/users/login")
      .send({ user: { email: "new@mail.com", password: alice.password } })
      .expect(200);
  });

  test("renaming returns a token for the new username and orphans the old one", async () => {
    const alice = await registerUser("alice");
    const res = await api
      .put("/api/user")
      .set(auth(alice))
      .send({ user: { username: "alicia" } })
      .expect(200);
    expect(res.body.user.username).toBe("alicia");

    const renamed = await api
      .get("/api/user")
      .set({ Authorization: `Token ${res.body.user.token}` })
      .expect(200);
    expect(renamed.body.user.username).toBe("alicia");

    await api.get("/api/user").set(auth(alice)).expect(404);
  });

  // Known bug: the new password is stored as plain text, so logging in with it fails.
  test("stores an updated password unhashed", async () => {
    const alice = await registerUser("alice");
    await api
      .put("/api/user")
      .set(auth(alice))
      .send({ user: { password: "new-password" } })
      .expect(200);

    const stored = await prisma.user.findUniqueOrThrow({
      where: { username: "alice" },
    });
    expect(stored.password).toBe("new-password");
    await api
      .post("/api/users/login")
      .send({ user: { email: alice.email, password: "new-password" } })
      .expect(401);
  });

  test("rejects an email that belongs to another user with 422", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");
    const res = await api
      .put("/api/user")
      .set(auth(alice))
      .send({ user: { email: bob.email } })
      .expect(422);
    expect(res.body.errors[0]).toMatch(/email is not unique/);
  });

  test("rejects unknown fields", async () => {
    const alice = await registerUser("alice");
    const res = await api
      .put("/api/user")
      .set(auth(alice))
      .send({ user: { foo: "bar" } })
      .expect(400);
    expect(res.body.errors.body).toEqual([
      "foo is not one of the fields accepted",
    ]);
  });

  test("rejects a missing or non-object user", async () => {
    const alice = await registerUser("alice");
    const missing = await api
      .put("/api/user")
      .set(auth(alice))
      .send({})
      .expect(400);
    expect(missing.body.errors.body).toEqual(["user property must exist"]);

    const notObject = await api
      .put("/api/user")
      .set(auth(alice))
      .send({ user: "alice" })
      .expect(400);
    expect(notObject.body.errors.body).toEqual(["user must be an object"]);
  });

  test("returns 401 without a token", async () => {
    await api
      .put("/api/user")
      .send({ user: { bio: "x" } })
      .expect(401);
  });

  test("returns 422 when the token's user no longer exists", async () => {
    const alice = await registerUser("alice");
    await prisma.user.delete({ where: { username: "alice" } });
    await api
      .put("/api/user")
      .set(auth(alice))
      .send({ user: { bio: "x" } })
      .expect(422);
  });
});
