import { Request, Response } from "express";
import prisma from "../../utils/db/prisma";
import tagViewer from "../../view/tagViewer";
import logger from "../../utils/logger";

/**
 * Tags controller that responds with a list of all the tags on the system.
 * @param _req
 * @param res
 * @returns
 */
export default async function getTags(_req: Request, res: Response) {
  logger.debug("getTags");
  // Get all the tags
  const tags = await prisma.tag.findMany();

  // Create the tags view
  const tagsView = tags.map((tag) => tagViewer(tag));

  return res.json({ tags: tagsView });
}
