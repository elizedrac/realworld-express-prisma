import { api, createArticle, registerUser } from "./helpers";

test("lists at most 10 articles by default", async () => {
  const alice = await registerUser("alice");
  for (let i = 0; i < 11; i++) {
    await createArticle(alice, { title: `Article ${i}` });
  }
  const res = await api.get("/api/articles").expect(200);
  expect(res.body.articles).toHaveLength(10);
});
