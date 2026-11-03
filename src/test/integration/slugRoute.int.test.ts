import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/articles/:slug", () => {
  test("serves a well-formed slug", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Hello World" });
    await api.get("/api/articles/hello-world").expect(200);
  });

  test("is 404 for a malformed slug", async () => {
    await api.get("/api/articles/Hello_World!").expect(404);
  });
});
