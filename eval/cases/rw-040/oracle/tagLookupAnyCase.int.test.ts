// Oracle for rw-040: a tag can be looked up by the name it was created with.
import { api, createArticle, registerUser } from "../helpers";

test("GET /api/tags/:tag finds a tag created with capitals", async () => {
  const alice = await registerUser("alice");
  await createArticle(alice, { title: "Hooks", tagList: ["React"] });
  const res = await api.get("/api/tags/React").expect(200);
  expect(res.body.tag.articlesCount).toBe(1);
});
