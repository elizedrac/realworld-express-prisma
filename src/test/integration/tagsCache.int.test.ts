import prisma from "../../utils/db/prisma";
import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/tags cache", () => {
  test("serves repeated reads from the cache", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Tagged", tagList: ["x"] });
    expect((await api.get("/api/tags").expect(200)).body.tags).toEqual(["x"]);

    // A raw read query does not count as a write, so the cache is kept.
    await prisma.$queryRaw`INSERT INTO "Tag" ("tagName") VALUES ('raw') RETURNING "tagName"`;
    expect((await api.get("/api/tags").expect(200)).body.tags).toEqual(["x"]);
  });

  test("shows a new tag right after an article adds it", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "First", tagList: ["x"] });
    expect((await api.get("/api/tags").expect(200)).body.tags).toEqual(["x"]);
    await createArticle(alice, { title: "Second", tagList: ["y"] });
    const res = await api.get("/api/tags").expect(200);
    expect(res.body.tags.sort()).toEqual(["x", "y"]);
  });
});
