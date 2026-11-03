// Oracle for rw-037: every article can be fetched by the slug it was given.
import { api, createArticle, registerUser } from "../helpers";

test("an article with an accented title can be fetched by its slug", async () => {
  const alice = await registerUser("alice");
  const article = await createArticle(alice, { title: "Crème Brûlée" });
  await api
    .get(`/api/articles/${encodeURIComponent(article.slug)}`)
    .expect(200);
});
