// Oracle for rw-011: GET /api/tags must agree with the Tag table after an article is deleted.
import prisma from "../../../utils/db/prisma";
import { api, auth, createArticle, registerUser } from "../helpers";

test("the tag list reflects the database after deleting an article", async () => {
  const alice = await registerUser("alice");
  await createArticle(alice, { title: "Doomed", tagList: ["solo"] });
  await api.get("/api/tags").expect(200);

  await api.delete("/api/articles/doomed").set(auth(alice)).expect(200);

  const listed = await api.get("/api/tags").expect(200);
  const stored = await prisma.tag.findMany();
  expect(listed.body.tags.sort()).toEqual(stored.map((t) => t.tagName).sort());
});
