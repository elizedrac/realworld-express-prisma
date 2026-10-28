import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../utils/db/prisma";
import { api, auth, registerUser } from "./helpers";

describe("POST /api/users (register)", () => {
  test("creates the user and returns its view with a working token", async () => {
    const res = await api
      .post("/api/users")
      .send({
        user: { username: "alice", email: "alice@mail.com", password: "pw" },
      })
      .expect(201);

    expect(res.body).toEqual({
      user: {
        username: "alice",
        email: "alice@mail.com",
        bio: null,
        image: null,
        token: expect.any(String),
      },
    });

    const payload = jwt.verify(
      res.body.user.token,
      process.env.JWT_SECRET as string
    );
    expect(payload).toMatchObject({
      user: { username: "alice", email: "alice@mail.com" },
    });

    await api
      .get("/api/user")
      .set({ Authorization: `Token ${res.body.user.token}` })
      .expect(200);
  });

  test("stores the password hashed", async () => {
    await registerUser("alice");
    const stored = await prisma.user.findUniqueOrThrow({
      where: { username: "alice" },
    });
    expect(stored.password).not.toBe("alice-password");
    expect(bcrypt.compareSync("alice-password", stored.password)).toBe(true);
  });

  test("rejects a duplicate username with 422", async () => {
    await registerUser("alice");
    const res = await api
      .post("/api/users")
      .send({
        user: { username: "alice", email: "other@mail.com", password: "pw" },
      })
      .expect(422);
    expect(res.body.errors[0]).toMatch(/username is not unique/);
  });

  test("rejects a duplicate email with 422", async () => {
    await registerUser("alice");
    const res = await api
      .post("/api/users")
      .send({
        user: { username: "bob", email: "alice@mail.com", password: "pw" },
      })
      .expect(422);
    expect(res.body.errors[0]).toMatch(/email is not unique/);
  });

  test("rejects a body without a user object", async () => {
    const res = await api.post("/api/users").send({}).expect(400);
    expect(res.body.errors.body).toEqual(["user object must be defined"]);
  });

  test("reports every missing or non-string field", async () => {
    const missing = await api.post("/api/users").send({ user: {} }).expect(400);
    expect(missing.body.errors.body).toHaveLength(3);

    const wrongTypes = await api
      .post("/api/users")
      .send({ user: { username: 1, email: 2, password: 3 } })
      .expect(400);
    expect(wrongTypes.body.errors.body).toEqual([
      "password property in user must be a string",
      "email property in user must be a string",
      "username property in user must be a string",
    ]);
  });
});

describe("POST /api/users/login", () => {
  test("returns the user view with a working token", async () => {
    const alice = await registerUser("alice");
    const res = await api
      .post("/api/users/login")
      .send({ user: { email: alice.email, password: alice.password } })
      .expect(200);

    expect(res.body.user).toMatchObject({
      username: "alice",
      email: alice.email,
    });
    await api
      .get("/api/user")
      .set({ Authorization: `Token ${res.body.user.token}` })
      .expect(200);
  });

  test("returns 404 for an unknown email", async () => {
    await api
      .post("/api/users/login")
      .send({ user: { email: "nobody@mail.com", password: "pw" } })
      .expect(404);
  });

  test("returns 403 for a wrong password", async () => {
    const alice = await registerUser("alice");
    await api
      .post("/api/users/login")
      .send({ user: { email: alice.email, password: "wrong" } })
      .expect(403);
  });

  test("rejects a body without a user object", async () => {
    const res = await api.post("/api/users/login").send({}).expect(400);
    expect(res.body.errors.body).toEqual(["user object must be defined"]);
  });

  test("reports missing and non-string credentials", async () => {
    const missing = await api
      .post("/api/users/login")
      .send({ user: {} })
      .expect(400);
    expect(missing.body.errors.body).toHaveLength(2);

    const wrongTypes = await api
      .post("/api/users/login")
      .send({ user: { email: 1, password: 2 } })
      .expect(400);
    expect(wrongTypes.body.errors.body).toEqual([
      "password property in user must be a string",
      "email property in user must be a string",
    ]);
  });

  test("a token from login authorizes the same user as one from register", async () => {
    const alice = await registerUser("alice");
    const res = await api.get("/api/user").set(auth(alice)).expect(200);
    expect(res.body.user.username).toBe("alice");
  });
});
