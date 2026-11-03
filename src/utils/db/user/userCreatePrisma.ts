import prisma from "../prisma";

/**
 * Creates a user. The password must already be hashed.
 * @param username username of the new user
 * @param email email of the new user
 * @param password hashed password
 * @returns the created user
 */
export default async function userCreatePrisma(
  username: string,
  email: string,
  password: string
) {
  const user = await prisma.user.create({
    data: { username, email: email.trim().toLowerCase(), password },
  });
  return user;
}
