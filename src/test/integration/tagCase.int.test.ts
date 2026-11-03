import { api, createArticle, registerUser } from "./helpers";

describe("tag names", () => {
  test("are stored lowercase and trimmed", async () => {
    const alice = await registerUser("alice");
    const res = await createArticle(alice, {
      title: "Hooks",
      tagList: ["React", "react "],
    });
    expect(res.tagList).toEqual(["react"]);
  });

  test("match the list filter in any case", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Hooks", tagList: ["React"] });
    const res = await api.get("/api/articles?tag=REACT").expect(200);
    expect(res.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
      "hooks",
    ]);
  });
});
