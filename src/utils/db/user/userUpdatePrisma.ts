import prisma from "../prisma";

/** Fields of a user that can be changed. Fields left out are kept. */
interface UpdateFields {
  email?: string;
  username?: string;
  password?: string;
  image?: string;
  bio?: string;
}

/**
 * Updates the given fields of a user.
 * @param username username of the user to update
 * @param info fields to change
 * @returns the updated user, or null when no username is given
 */
export default async function userUpdatePrisma(
  username: string,
  info: UpdateFields
) {
  if (!username) return null;
  const user = await prisma.user.update({ where: { username }, data: info });
  return user;
}
