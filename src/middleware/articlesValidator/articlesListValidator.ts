import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import { ValidationError } from "../../utils/types";

/**
 * Middleware to validate request properties for articles listing controller.
 * @param req Request
 * @param res Response
 * @param next NextFunction
 * @returns
 */
export default async function articlesListValidator(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { tag, author, favorited, limit, offset, page } = req.query;
  const errors: ValidationError = {};
  errors.query = [];

  if (author && typeof author != "string")
    errors.query.push("author must be a string");

  if (tag && typeof tag != "string") errors.query.push("tag must be a string");

  if (favorited && typeof favorited != "string")
    errors.query.push("favorited must be a string");

  if (limit && typeof limit != "string")
    errors.query.push("limit must be a string");
  if (limit && typeof limit == "string") {
    const limitValue = parseInt(limit);
    if (isNaN(limitValue)) errors.query.push("limit is not a valid number");
  }

  if (offset && typeof offset != "string")
    errors.query.push("offset must be a string");
  if (offset && typeof offset == "string") {
    const offsetValue = parseInt(offset);
    if (isNaN(offsetValue)) errors.query.push("offset is not a valid number");
  }

  if (page && typeof page != "string")
    errors.query.push("page must be a string");
  if (page && typeof page == "string") {
    const pageValue = parseInt(page);
    if (isNaN(pageValue) || pageValue < 1)
      errors.query.push("page is not a valid page number");
  }

  if (errors.query.length > 0) return res.json({ errors });
  return next();
}
