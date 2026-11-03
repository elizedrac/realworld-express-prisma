// Oracle for rw-047: a password confirms with exactly what the user registered with.
import { api, auth } from "../helpers";

test("confirm-password accepts the registered password with spaces", async () => {
  const password = " hunter2 ";
  const res = await api
    .post("/api/users")
    .send({ user: { username: "alice", email: "alice@mail.com", password } })
    .expect(201);
  await api
    .post("/api/user/confirm-password")
    .set(auth({ username: "alice", email: "", password, token: res.body.user.token }))
    .send({ user: { password } })
    .expect(204);
});
