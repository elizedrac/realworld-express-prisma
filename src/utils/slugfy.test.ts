import slugfy from "./slugfy";

describe("slugfy", () => {
  test("keeps slugs at most 100 characters without a trailing dash", () => {
    const slug = slugfy("word ".repeat(60));
    expect(slug.length).toBeLessThanOrEqual(100);
    expect(slug.endsWith("-")).toBe(false);
  });

  test("leaves short titles alone", () => {
    expect(slugfy("Hello World")).toBe("hello-world");
  });
});
