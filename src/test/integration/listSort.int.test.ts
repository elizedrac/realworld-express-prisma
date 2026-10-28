import prisma from "../../utils/db/prisma";
import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/articles?sort=", () => {
  test("sorts by creation or update time", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "First" });
    await createArticle(alice, { title: "Second" });
    await prisma.article.update({
      where: { slug: "first" },
      data: {
        createdAt: new Date(Date.UTC(2024, 0, 1)),
        updatedAt: new Date(Date.UTC(2024, 0, 3)),
      },
    });
    await prisma.article.update({
      where: { slug: "second" },
      data: {
        createdAt: new Date(Date.UTC(2024, 0, 2)),
        updatedAt: new Date(Date.UTC(2024, 0, 2)),
      },
    });

    const slugs = (res: { body: { articles: { slug: string }[] } }) =>
      res.body.articles.map((a) => a.slug);
    expect(
      slugs(await api.get("/api/articles?sort=created").expect(200))
    ).toEqual(["second", "first"]);
    expect(
      slugs(await api.get("/api/articles?sort=updated").expect(200))
    ).toEqual(["first", "second"]);
    expect(slugs(await api.get("/api/articles").expect(200))).toEqual([
      "first",
      "second",
    ]);
  });

  // Validation errors are returned with status 200, like the other list filters.
  test("rejects an unknown sort", async () => {
    const res = await api.get("/api/articles?sort=random").expect(200);
    expect(res.body.errors.query).toEqual([
      "sort must be 'created' or 'updated'",
    ]);
  });
});
