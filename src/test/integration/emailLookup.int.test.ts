import prisma from "../../utils/db/prisma";
import { api } from "./helpers";

describe("email storage", () => {
  test("stores emails in lower case and finds them in any case", async () => {
    await api
      .post("/api/users")
      .send({
        user: { username: "alice", email: "Alice@Mail.com", password: "pw" },
      })
      .expect(201);
    const stored = await prisma.user.findUniqueOrThrow({
      where: { username: "alice" },
    });
    expect(stored.email).toBe("alice@mail.com");

    await api
      .post("/api/users/login")
      .send({ user: { email: " ALICE@MAIL.COM", password: "pw" } })
      .expect(200);
  });
});
