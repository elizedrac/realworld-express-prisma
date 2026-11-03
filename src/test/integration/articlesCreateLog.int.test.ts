import logger from "../../utils/logger";
import { createArticle, registerUser } from "./helpers";

test("logs each created article with its author", async () => {
  const info = jest.spyOn(logger, "info");
  try {
    const alice = await registerUser("alice");
    await createArticle(alice, { title: "Logged" });
    expect(info).toHaveBeenCalledWith("article logged created by alice");
  } finally {
    info.mockRestore();
  }
});
