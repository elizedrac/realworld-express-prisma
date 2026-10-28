import prisma from "../prisma";

export default async function userGetPrisma(username: string) {
  if (!username) return null;
  const user = await prisma.user.findUnique({
    where: { username },
    // Only the relations needed to describe the current user; profiles use profileGetPrisma.
    include: {
      follows: true,
      favorites: true,
    },
  });
  return user;
}
