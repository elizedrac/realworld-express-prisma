import { api, createArticle, registerUser } from "./helpers";

describe("GET /api/tags", () => {
  test("returns an empty list when there are no tags", async () => {
    const res = await api.get("/api/tags").expect(200);
    expect(res.body).toEqual({ tags: [] });
  });

  test("returns each tag once", async () => {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "One", tagList: ["a", "b"] });
    await createArticle(alice, { title: "Two", tagList: ["b", "c"] });
    const res = await api.get("/api/tags").expect(200);
    expect(res.body.tags.sort()).toEqual(["a", "b", "c"]);
  });
});

describe("app", () => {
  test("GET / identifies the backend", async () => {
    const res = await api.get("/").expect(200);
    expect(res.text).toBe("This is just the backend for RealWorld");
  });

  test("unknown routes return 404", async () => {
    await api.get("/api/nothing-here").expect(404);
  });

  // Known bug: malformed JSON should be a 400, but the parser error reaches the generic 500 handler.
  test("malformed JSON bodies return 500", async () => {
    await api
      .post("/api/users")
      .set("Content-Type", "application/json")
      .send('{"user": ')
      .expect(500);
  });
});
