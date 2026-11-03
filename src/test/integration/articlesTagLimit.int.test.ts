import { api, auth, createArticle, registerUser } from "./helpers";

describe("POST /api/articles tag limit", () => {
  test("accepts up to 10 tags", async () => {
    const alice = await registerUser("alice");
    const tagList = Array.from({ length: 10 }, (_, i) => `t${i}`);
    const article = await createArticle(alice, { title: "Ten", tagList });
    expect(article.tagList).toHaveLength(10);
  });

  test("rejects more than 10 tags with 422", async () => {
    const alice = await registerUser("alice");
    const tagList = Array.from({ length: 11 }, (_, i) => `t${i}`);
    const res = await api
      .post("/api/articles")
      .set(auth(alice))
      .send({
        article: { title: "Eleven", description: "d", body: "b", tagList },
      })
      .expect(422);
    expect(res.body.errors.body).toEqual(["at most 10 tags are allowed"]);
  });
});
