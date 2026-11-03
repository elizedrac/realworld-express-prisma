import prisma from "../prisma";

const KEEP = 10;

/**
 * Records that the user viewed the article.
 * @param username viewer
 * @param slug viewed article
 */
export async function recordViewPrisma(username: string, slug: string) {
  await prisma.recentView.upsert({
    where: { username_slug: { username, slug } },
    create: { username, slug },
    update: { viewedAt: new Date() },
  });
}

/**
 * Gets the articles the user viewed most recently, newest first.
 * @param username viewer
 * @returns the articles, at most KEEP
 */
export async function recentArticlesPrisma(username: string) {
  const views = await prisma.recentView.findMany({
    where: { username },
    orderBy: { viewedAt: "desc" },
    take: KEEP,
  });
  const articles = await prisma.article.findMany({
    where: { slug: { in: views.map((view) => view.slug) } },
    include: {
      author: { include: { followedBy: true } },
      tagList: true,
      _count: { select: { favoritedBy: true } },
    },
  });
  const bySlug = new Map(articles.map((article) => [article.slug, article]));
  return views.flatMap((view) => bySlug.get(view.slug) ?? []);
}
