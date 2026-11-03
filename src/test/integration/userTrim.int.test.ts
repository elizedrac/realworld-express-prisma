import { api, auth, registerUser } from "./helpers";

test("PUT /api/user trims the bio and image", async () => {
  const alice = await registerUser("alice");
  const res = await api
    .put("/api/user")
    .set(auth(alice))
    .send({
      user: { bio: "  hello  ", image: " https://img.example.com/a.png\n" },
    })
    .expect(200);
  expect(res.body.user).toMatchObject({
    bio: "hello",
    image: "https://img.example.com/a.png",
  });
});
