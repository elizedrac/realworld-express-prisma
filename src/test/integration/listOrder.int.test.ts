import prisma from "../../utils/db/prisma";
import { api, auth, createArticle, registerUser } from "./helpers";

test("editing an article does not move it up the list", async () => {
  const alice = await registerUser("alice");
  await createArticle(alice, { title: "Older" });
  await createArticle(alice, { title: "Newer" });
  await prisma.article.update({
    where: { slug: "older" },
    data: { createdAt: new Date(Date.UTC(2024, 0, 1)) },
  });
  await prisma.article.update({
    where: { slug: "newer" },
    data: { createdAt: new Date(Date.UTC(2024, 0, 2)) },
  });

  await api
    .put("/api/articles/older")
    .set(auth(alice))
    .send({ article: { body: "edited" } })
    .expect(200);

  const res = await api.get("/api/articles").expect(200);
  expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
    "newer",
    "older",
  ]);
});
