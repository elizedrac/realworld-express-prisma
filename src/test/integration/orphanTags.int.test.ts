import prisma from "../../utils/db/prisma";
import { api, auth, createArticle, registerUser } from "./helpers";

test("deleting an article removes tags no other article uses", async () => {
  const alice = await registerUser("alice");
  await createArticle(alice, { title: "Doomed", tagList: ["solo", "shared"] });
  await createArticle(alice, { title: "Kept", tagList: ["shared"] });

  await api.delete("/api/articles/doomed").set(auth(alice)).expect(200);

  const tags = await prisma.tag.findMany({ orderBy: { tagName: "asc" } });
  expect(tags.map((t) => t.tagName)).toEqual(["shared"]);
});
