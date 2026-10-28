import prisma from "../prisma";

export default async function articleCountPrisma(
  tag?: string,
  authorUsername?: string,
  favorited?: string
) {
  return prisma.article.count({
    where: {
      authorUsername,
      tagList: tag ? { some: { tagName: tag } } : undefined,
      favoritedBy: favorited ? { some: { username: favorited } } : undefined,
    },
  });
}
