import { Request, Response } from "express";
import prisma from "../../utils/db/prisma";
import tagViewer from "../../view/tagViewer";

/**
 * Responds with the names of all the tags on the system.
 * @param _req Request
 * @param res Response
 * @returns void
 */
export default async function getTags(_req: Request, res: Response) {
  // Get all the tags
  const tags = await prisma.tag.findMany();

  // Create the tags view
  const tagsView = tags.map((tag) => tagViewer(tag));

  return res.json({ tags: tagsView });
}
