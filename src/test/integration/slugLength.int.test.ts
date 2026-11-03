import { createArticle, registerUser } from "./helpers";

test("slugs are at most 60 characters", async () => {
  const alice = await registerUser("alice");
  const article = await createArticle(alice, {
    title: "a very long title ".repeat(10),
  });
  expect(article.slug.length).toBeLessThanOrEqual(60);
  expect(article.slug.endsWith("-")).toBe(false);
});
