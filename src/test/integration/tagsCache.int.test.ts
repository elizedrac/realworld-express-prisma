import prisma from "../../utils/db/prisma";
import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/tags caching", () => {
  test("serves repeated requests from the cache", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "One", tagList: ["a"] });
    await api.get("/api/tags").expect(200);

    const findMany = jest.spyOn(prisma.tag, "findMany");
    const res = await api.get("/api/tags").expect(200);
    expect(res.body.tags).toEqual(["a"]);
    expect(findMany).not.toHaveBeenCalled();
    findMany.mockRestore();
  });

  test("picks up tags from newly created articles", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "One", tagList: ["a"] });
    await api.get("/api/tags").expect(200);
    await createArticle(alice, { title: "Two", tagList: ["b"] });

    const res = await api.get("/api/tags").expect(200);
    expect(res.body.tags.sort()).toEqual(["a", "b"]);
  });
});
