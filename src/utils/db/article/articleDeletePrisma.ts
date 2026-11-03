import prisma from "../prisma";

export default async function articleDeletePrisma(slug: string) {
  await prisma.comment.deleteMany({ where: { articleSlug: slug } });
  const article = await prisma.article.update({
    where: { slug },
    data: { deletedAt: new Date() },
    include: {
      author: { include: { followedBy: true } },
      tagList: true,
      _count: { select: { favoritedBy: true } },
    },
  });
  return article;
}
