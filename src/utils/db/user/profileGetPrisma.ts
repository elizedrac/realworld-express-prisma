import prisma from "../prisma";

export default async function profileGetPrisma(username: string) {
  const profile = await prisma.user.findUnique({
    where: { username },
    include: { followedBy: true },
  });
  return profile;
}
