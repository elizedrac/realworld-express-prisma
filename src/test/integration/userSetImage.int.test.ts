import { api, auth, registerUser } from "./helpers";

describe("PUT /api/user/image", () => {
  test("sets the image and nothing else", async () => {
    const alice = await registerUser("alice");
    const res = await api
      .put("/api/user/image")
      .set(auth(alice))
      .send({ image: "https://img.example.com/a.png" })
      .expect(200);
    expect(res.body.user).toMatchObject({
      username: "alice",
      bio: null,
      image: "https://img.example.com/a.png",
    });
  });

  test("rejects a missing image", async () => {
    const alice = await registerUser("alice");
    await api.put("/api/user/image").set(auth(alice)).send({}).expect(400);
  });
});
