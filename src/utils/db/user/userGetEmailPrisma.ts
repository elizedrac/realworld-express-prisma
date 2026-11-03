import prisma from "../prisma";

/**
 * Finds a user by email, with its follows, followers, articles and favorites.
 * @param email email to look up
 * @returns the user, or null if there is none
 */
export default async function userGetEmailPrisma(email: string) {
  if (!email) return null;
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: {
      follows: true,
      followedBy: true,
      authored: true,
      favorites: true,
    },
  });
  return user;
}
