import { Prisma } from "@prisma/client";
import prisma from "../prisma";

export default async function articlesListPrisma(
  tag?: string,
  authorUsername?: string,
  favorited?: string,
  limit = 20,
  offset = 0
) {
  const where: Prisma.ArticleWhereInput = {};
  if (authorUsername) where.authorUsername = authorUsername;
  if (tag) where.tagList = { some: { tagName: tag } };
  if (favorited) where.favoritedBy = { some: { username: favorited } };

  const articles = await prisma.article.findMany({
    where,
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
