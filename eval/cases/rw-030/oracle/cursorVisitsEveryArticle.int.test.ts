// Oracle for rw-030: paging with ?after= visits every article exactly once, even after an edit.
import prisma from "../../../utils/db/prisma";
import { api, auth, createArticle, registerUser } from "../helpers";

test("cursor paging visits every article once after an edit", async () => {
  const alice = await registerUser("alice");
  for (const [index, title] of ["One", "Two", "Three"].entries()) {
    await createArticle(alice, { title });
    const at = new Date(Date.UTC(2024, 0, index + 1));
    await prisma.article.update({
      where: { slug: title.toLowerCase() },
      data: { createdAt: at, updatedAt: at },
    });
  }
  // Editing the oldest article makes it the most recently updated one.
  await api
    .put("/api/articles/one")
    .set(auth(alice))
    .send({ article: { body: "edited" } })
    .expect(200);

  const seen: string[] = [];
  let after: string | undefined;
  for (let page = 0; page < 6; page++) {
    const query = after ? `?limit=1&after=${after}` : "?limit=1";
    const res = await api.get(`/api/articles${query}`).expect(200);
    if (res.body.articles.length === 0) break;
    after = res.body.articles[0].slug;
    seen.push(after as string);
  }
  expect(seen.sort()).toEqual(["one", "three", "two"]);
});
