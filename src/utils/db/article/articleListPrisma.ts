import prisma from "../prisma";

export default async function articlesListPrisma(
  tag?: string,
  authorUsername?: string,
  favorited?: string,
  limit = 20,
  offset = 0,
  search?: string
) {
  const articles = await prisma.article.findMany({
    where: {
      authorUsername,
      tagList: tag ? { some: { tagName: tag } } : undefined,
      favoritedBy: favorited ? { some: { username: favorited } } : undefined,
      OR: search
        ? [
            { title: { contains: search, mode: "insensitive" } },
            { body: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    take: limit,
    skip: offset,
    orderBy: { updatedAt: "desc" },
    include: {
      author: { include: { followedBy: true } },
      tagList: true,
      _count: { select: { favoritedBy: true } },
    },
  });
  return articles;
}
