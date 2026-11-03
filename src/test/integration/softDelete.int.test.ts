import prisma from "../../utils/db/prisma";
import { api, auth, createArticle, registerUser } from "./helpers";

describe("DELETE /api/articles/:slug soft delete", () => {
  test("hides the article but keeps the row", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Gone" });
    await api.delete("/api/articles/gone").set(auth(alice)).expect(200);

    await api.get("/api/articles/gone").expect(404);
    expect((await api.get("/api/articles").expect(200)).body.articles).toEqual(
      []
    );
    const row = await prisma.article.findUnique({ where: { slug: "gone" } });
    expect(row?.deletedAt).toBeInstanceOf(Date);
  });
});
