import { api, auth, createArticle, registerUser } from "./helpers";

test("tags of a deleted article disappear from the tag list", async () => {
  const alice = await registerUser("alice");
  await createArticle(alice, { title: "Doomed", tagList: ["solo", "shared"] });
  await createArticle(alice, { title: "Kept", tagList: ["shared"] });

  await api.delete("/api/articles/doomed").set(auth(alice)).expect(200);

  const res = await api.get("/api/tags").expect(200);
  expect(res.body.tags).toEqual(["shared"]);
});
