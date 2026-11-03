import { Prisma } from "@prisma/client";
import prisma from "../prisma";

/**
 * Finds a user by any unique field, with its follows, followers, articles and favorites.
 * @param where unique field to look up, e.g. { email }
 * @returns the user, or null if there is none
 */
export default async function userFindPrisma(
  where: Prisma.UserWhereUniqueInput
) {
  const user = await prisma.user.findUnique({
    where,
    include: {
      follows: true,
      followedBy: true,
      authored: true,
      favorites: true,
    },
  });
  return user;
}
