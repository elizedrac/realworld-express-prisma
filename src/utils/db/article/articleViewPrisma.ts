import prisma from "../prisma";

export default async function articleViewPrisma(slug: string) {
  const article = await prisma.article.update({
    where: { slug },
    data: { views: { increment: 1 } },
    select: { views: true },
  });
  return article;
}
