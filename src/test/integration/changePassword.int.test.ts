import prisma from "../../utils/db/prisma";
import { api, auth, registerUser } from "./helpers";

describe("POST /api/user/password", () => {
  test("changes the password and never stores it in plain text", async () => {
    const alice = await registerUser("alice");
    const before = await prisma.user.findUniqueOrThrow({
      where: { username: "alice" },
    });

    await api
      .post("/api/user/password")
      .set(auth(alice))
      .send({ currentPassword: alice.password, newPassword: "new-password" })
      .expect(204);

    const after = await prisma.user.findUniqueOrThrow({
      where: { username: "alice" },
    });
    expect(after.password).not.toBe("new-password");
    expect(after.password).not.toBe(before.password);
  });

  test("rejects a wrong current password", async () => {
    const alice = await registerUser("alice");
    await api
      .post("/api/user/password")
      .set(auth(alice))
      .send({ currentPassword: "wrong", newPassword: "new-password" })
      .expect(403);
  });

  test("rejects a missing new password", async () => {
    const alice = await registerUser("alice");
    await api
      .post("/api/user/password")
      .set(auth(alice))
      .send({ currentPassword: alice.password })
      .expect(400);
  });
});
