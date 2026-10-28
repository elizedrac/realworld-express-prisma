import { api, auth, registerUser } from "./helpers";

test("an empty image clears the user's avatar", async () => {
  const alice = await registerUser("alice");
  await api
    .put("/api/user")
    .set(auth(alice))
    .send({ user: { image: "https://img/a.png" } })
    .expect(200);

  const cleared = await api
    .put("/api/user")
    .set(auth(alice))
    .send({ user: { image: "" } })
    .expect(200);
  expect(cleared.body.user.image).toBeNull();

  const current = await api.get("/api/user").set(auth(alice)).expect(200);
  expect(current.body.user.image).toBeNull();
});
