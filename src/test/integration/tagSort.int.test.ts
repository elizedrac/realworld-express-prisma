import { createArticle, registerUser } from "./helpers";

test("tags are sorted ignoring case", async () => {
  const alice = await registerUser("alice");
  const article = await createArticle(alice, {
    title: "Hooks",
    tagList: ["React", "javascript", "Zod"],
  });
  expect(article.tagList).toEqual(["javascript", "React", "Zod"]);
});
