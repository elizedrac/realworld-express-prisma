import prisma from "../../utils/db/prisma";
import { api, auth, createArticle, registerUser } from "./helpers";

test("the feed lists the most recently updated articles first", async () => {
  const alice = await registerUser("alice");
  await createArticle(alice, { title: "Older" });
  await createArticle(alice, { title: "Newer" });
  await prisma.article.update({
    where: { slug: "older" },
    data: { updatedAt: new Date(Date.UTC(2024, 0, 1)) },
  });
  await prisma.article.update({
    where: { slug: "newer" },
    data: { updatedAt: new Date(Date.UTC(2024, 0, 2)) },
  });

  const res = await api.get("/api/articles/feed").set(auth(alice)).expect(200);
  expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
    "newer",
    "older",
  ]);
});
