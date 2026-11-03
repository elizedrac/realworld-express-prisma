import { api, auth, registerUser } from "./helpers";

test("rejects an article body over 20,000 characters", async () => {
  const alice = await registerUser("alice");
  await api
    .post("/api/articles")
    .set(auth(alice))
    .send({
      article: { title: "Long", description: "d", body: "x".repeat(20_001) },
    })
    .expect(400);
});
