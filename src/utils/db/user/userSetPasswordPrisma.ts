import prisma from "../prisma";

/**
 * Stores a new password hash for the user.
 * @param username user to update
 * @param passwordHash hash of the new password
 * @returns the updated user
 */
export default async function userSetPasswordPrisma(
  username: string,
  passwordHash: string
) {
  return prisma.user.update({
    where: { username },
    data: { password: passwordHash },
  });
}
