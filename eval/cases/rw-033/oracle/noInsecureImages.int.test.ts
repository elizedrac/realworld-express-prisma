// Oracle for rw-033: no endpoint lets a user store an image that is not https.
import prisma from "../../../utils/db/prisma";
import { api, auth, registerUser } from "../helpers";

test("an http image is rejected by every endpoint that sets it", async () => {
  const alice = await registerUser("alice");
  const image = "http://img.example.com/a.png";

  const viaUpdate = await api
    .put("/api/user")
    .set(auth(alice))
    .send({ user: { image } });
  expect(viaUpdate.status).toBeGreaterThanOrEqual(400);

  const viaImage = await api
    .put("/api/user/image")
    .set(auth(alice))
    .send({ image });
  expect(viaImage.status).toBeGreaterThanOrEqual(400);

  const stored = await prisma.user.findUniqueOrThrow({
    where: { username: "alice" },
  });
  expect(stored.image).toBeNull();
});
