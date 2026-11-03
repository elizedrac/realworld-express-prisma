import articleCreatePrisma from "../../utils/db/article/articleCreatePrisma";
import { registerUser } from "./helpers";

test("titles over 120 characters are cut when saved", async () => {
  await registerUser("alice");
  const article = await articleCreatePrisma(
    { title: "t".repeat(130), description: "d", body: "b" },
    [],
    "alice"
  );
  expect(article.title).toHaveLength(120);
});
