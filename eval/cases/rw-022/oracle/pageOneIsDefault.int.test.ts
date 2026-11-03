// Oracle for rw-022: the list without ?page is page 1, so paging on from it skips nothing.
import { api, createArticle, registerUser } from "../helpers";

test("the default list and ?page=2 cover every article", async () => {
  const alice = await registerUser("alice");
  for (let i = 1; i <= 25; i++)
    await createArticle(alice, { title: `Article ${i}` });

  const first = await api.get("/api/articles").expect(200);
  const second = await api.get("/api/articles?page=2").expect(200);
  const slugs = [...first.body.articles, ...second.body.articles].map(
    (a: { slug: string }) => a.slug
  );
  expect(new Set(slugs).size).toBe(25);
});
