import { api, auth, registerUser } from "./helpers";

test("rejects a title over 100 characters", async () => {
  const alice = await registerUser("alice");
  const res = await api
    .post("/api/articles")
    .set(auth(alice))
    .send({ article: { title: "t".repeat(101), description: "d", body: "b" } })
    .expect(400);
  expect(res.body.errors.body).toEqual([
    "title must be at most 100 characters",
  ]);
});
