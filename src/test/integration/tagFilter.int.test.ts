import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/articles?tag= casing", () => {
  test("matches lowercase tags whatever casing the filter uses", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Tagged", tagList: ["dragons"] });
    await createArticle(alice, { title: "Untagged" });

    for (const filter of ["dragons", "DRAGONS", "%20Dragons%20"]) {
      const res = await api.get(`/api/articles?tag=${filter}`).expect(200);
      expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
        "tagged",
      ]);
    }
  });
});
