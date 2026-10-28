// Oracle for rw-012: after changing the password, the user can log in with the new one.
import { api, auth, registerUser } from "../helpers";

test("the new password works for login after POST /api/user/password", async () => {
  const alice = await registerUser("alice");
  await api
    .post("/api/user/password")
    .set(auth(alice))
    .send({ currentPassword: alice.password, newPassword: "new-password" })
    .expect(204);

  await api
    .post("/api/users/login")
    .send({ user: { email: alice.email, password: "new-password" } })
    .expect(200);
});
