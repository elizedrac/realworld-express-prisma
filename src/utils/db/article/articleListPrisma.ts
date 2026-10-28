import prisma from "../prisma";

interface ListOptions {
  tag?: string;
  authorUsername?: string;
  favorited?: string;
  limit?: number;
  offset?: number;
}

export default async function articlesListPrisma({
  tag,
  authorUsername,
  favorited,
  limit = 20,
  offset = 0,
}: ListOptions = {}) {
  const articles = await prisma.article.findMany({
    where: {
      authorUsername,
      tagList: tag ? { some: { tagName: tag } } : undefined,
      favoritedBy: favorited ? { some: { username: favorited } } : undefined,
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
