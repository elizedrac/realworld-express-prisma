import prisma from "../prisma";

export default async function tagsCreatePrisma(tags: Array<string>) {
  // Store tags trimmed and lowercased so "Dragons " and "dragons" are the same tag.
  const tagNames = [...new Set(tags.map((tag) => tag.trim().toLowerCase()))];
  const createdTags = [];
  for (const tagName of tagNames) {
    createdTags.push(
      await prisma.tag.upsert({
        create: { tagName },
        where: { tagName },
        update: {},
      })
    );
  }
  return createdTags;
}
