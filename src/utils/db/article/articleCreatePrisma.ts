import { Tag } from "@prisma/client";
import prisma from "../prisma";
import slugfy from "../../slugfy";

const MAX_TITLE_CHARS = 120;

interface RequiredFields {
  title: string;
  description: string;
  body: string;
}

export default async function articleCreatePrisma(
  info: RequiredFields,
  tagList: Tag[],
  authorUsername: string
) {
  // Very long titles make unusable slugs, so they are cut when saved.
  const title = info.title.slice(0, MAX_TITLE_CHARS);
  const slug = slugfy(title);
  const article = await prisma.article.create({
    data: {
      ...info,
      title,
      slug,
      authorUsername,
      tagList: { connect: tagList },
    },
    include: {
      author: { include: { followedBy: true } },
      tagList: true,
      _count: { select: { favoritedBy: true } },
    },
  });
  return article;
}
