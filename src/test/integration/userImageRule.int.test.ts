import { api, auth, registerUser } from "./helpers";

describe("PUT /api/user image rule", () => {
  test("rejects an image that is not https", async () => {
    const alice = await registerUser("alice");
    const res = await api
      .put("/api/user")
      .set(auth(alice))
      .send({ user: { image: "http://img.example.com/a.png" } })
      .expect(400);
    expect(res.body.errors.body).toEqual(["image must be an https URL"]);
  });

  test("accepts an https image or clearing it", async () => {
    const alice = await registerUser("alice");
    for (const image of ["https://img.example.com/a.png", ""]) {
      await api
        .put("/api/user")
        .set(auth(alice))
        .send({ user: { image } })
        .expect(200);
    }
  });
});
