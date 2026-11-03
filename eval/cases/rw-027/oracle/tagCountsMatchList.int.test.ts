// Oracle for rw-027: each tag's count must match the articles the list shows for it, after a delete.
import { api, auth, createArticle, registerUser } from "../helpers";

test("tag counts only count articles that are still listed", async () => {
  const alice = await registerUser("alice");
  await createArticle(alice, { title: "Kept", tagList: ["t"] });
  await createArticle(alice, { title: "Doomed", tagList: ["t", "u"] });
  await api.delete("/api/articles/doomed").set(auth(alice)).expect(200);

  const counts = (await api.get("/api/tags/counts").expect(200)).body.tags as {
    tag: string;
    count: number;
  }[];
  for (const tag of ["t", "u"]) {
    const listed = await api.get(`/api/articles?tag=${tag}`).expect(200);
    const counted = counts.find((entry) => entry.tag === tag)?.count ?? 0;
    expect({ tag, count: counted }).toEqual({
      tag,
      count: listed.body.articles.length,
    });
  }
});
