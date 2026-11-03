import { createArticle, registerUser } from "./helpers";

test("slugs keep accented letters", async () => {
  const alice = await registerUser("alice");
  const article = await createArticle(alice, { title: "Crème Brûlée" });
  expect(article.slug).toBe("crème-brûlée");
});

test("non-Latin titles keep their letters", async () => {
  const alice = await registerUser("alice");
  const article = await createArticle(alice, { title: "Привет мир" });
  expect(article.slug).toBe("привет-мир");
});
