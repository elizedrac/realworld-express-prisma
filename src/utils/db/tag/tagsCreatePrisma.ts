import prisma from "../prisma";

export default async function tagsCreatePrisma(tags: Array<string>) {
  const createdTags = [];
  // Tags are stored trimmed and lowercase so "React" and "react " are one tag.
  const names = [...new Set(tags.map((tag) => tag.trim().toLowerCase()))];
  for (const tag of names) {
    createdTags.push(
      await prisma.tag.upsert({
        create: { tagName: tag },
        where: { tagName: tag },
        update: {},
      })
    );
  }
  return createdTags;
}
