// Oracle for rw-013: reading an article must not change its updatedAt or its place in the list.
import prisma from "../../../utils/db/prisma";
import { api, createArticle, registerUser } from "../helpers";

test("GET /api/articles/:slug leaves updatedAt and list order alone", async () => {
  const alice = await registerUser("alice");
  await createArticle(alice, { title: "Older" });
  await createArticle(alice, { title: "Newer" });
  const older = new Date(Date.UTC(2024, 0, 1));
  await prisma.article.update({
    where: { slug: "older" },
    data: { updatedAt: older },
  });
  await prisma.article.update({
    where: { slug: "newer" },
    data: { updatedAt: new Date(Date.UTC(2024, 0, 2)) },
  });

  await api.get("/api/articles/older").expect(200);

  const res = await api.get("/api/articles").expect(200);
  expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
    "newer",
    "older",
  ]);
  const stored = await prisma.article.findUniqueOrThrow({
    where: { slug: "older" },
  });
  expect(stored.updatedAt.toISOString()).toBe(older.toISOString());
});
