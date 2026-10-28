import { api, auth, registerUser } from "./helpers";

test("rejects titles longer than 150 characters", async () => {
  const alice = await registerUser("alice");
  const res = await api
    .post("/api/articles")
    .set(auth(alice))
    .send({ article: { title: "x".repeat(151), description: "d", body: "b" } })
    .expect(400);
  expect(res.body.errors.body).toEqual([
    "title must be at most 150 characters",
  ]);

  await api
    .post("/api/articles")
    .set(auth(alice))
    .send({ article: { title: "x".repeat(150), description: "d", body: "b" } })
    .expect(201);
});
