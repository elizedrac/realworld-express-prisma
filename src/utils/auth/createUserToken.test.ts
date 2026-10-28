describe("JWT_SECRET is required", () => {
  const secret = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock("dotenv", () => ({ config: jest.fn() }));
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    process.env.JWT_SECRET = secret;
    jest.dontMock("dotenv");
  });

  test("createUserToken throws without it", async () => {
    const { default: createUserToken } = await import("./createUserToken");
    expect(() =>
      createUserToken({
        username: "alice",
        email: "a@mail.com",
        password: "x",
        bio: null,
        image: null,
      })
    ).toThrow("JWT_SECRET missing in environment.");
  });

  test("the authenticator module refuses to load without it", async () => {
    await expect(import("../../middleware/auth/authenticator")).rejects.toThrow(
      "JWT_SECRET missing in environment."
    );
  });
});
