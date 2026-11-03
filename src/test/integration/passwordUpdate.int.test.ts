import { api, auth, registerUser } from "./helpers";

test("a password changed through PUT /api/user works for login", async () => {
  const alice = await registerUser("alice");
  await api
    .put("/api/user")
    .set(auth(alice))
    .send({ user: { password: "new-password" } })
    .expect(200);

  await api
    .post("/api/users/login")
    .send({ user: { email: alice.email, password: "new-password" } })
    .expect(200);
  await api
    .post("/api/users/login")
    .send({ user: { email: alice.email, password: alice.password } })
    .expect(403);
});
