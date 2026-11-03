import { User } from "@prisma/client";
import prisma from "../prisma";

export default async function commentDeletePrisma(
  slug: string,
  id: number,
  user: User,
  asModerator = false
) {
  // See if user is the author of the comment it wants to delete; moderators
  // may delete any comment.
  await prisma.comment.findFirstOrThrow({
    where: asModerator ? { id } : { id, authorUsername: user.username },
    include: { author: true },
  });

  // Delete the comment from the database.
  const deletedComment = await prisma.comment.delete({
    where: { id },
    include: {
      author: {
        include: { followedBy: { where: { username: user.username } } },
      },
    },
  });
  return deletedComment;
}
