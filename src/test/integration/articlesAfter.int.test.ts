import prisma from "../../utils/db/prisma";
import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/articles?after=", () => {
  test("continues the list after the given article", async () => {
    const alice = await registerUser("alice");
    for (const [index, title] of ["One", "Two", "Three"].entries()) {
      await createArticle(alice, { title });
      await prisma.article.update({
        where: { slug: title.toLowerCase() },
        data: { updatedAt: new Date(Date.UTC(2024, 0, index + 1)) },
      });
    }

    const first = await api.get("/api/articles?limit=2").expect(200);
    expect(first.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
      "three",
      "two",
    ]);
    const next = await api.get("/api/articles?limit=2&after=two").expect(200);
    expect(next.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
      "one",
    ]);
  });

  test("returns 404 for an unknown cursor", async () => {
    await api.get("/api/articles?after=nope").expect(404);
  });
});
