import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import { ParsedQs } from "qs";
import articleGetPrisma from "../../utils/db/article/articleGetPrisma";
import articlesListPrisma from "../../utils/db/article/articleListPrisma";
import userGetPrisma from "../../utils/db/user/userGetPrisma";
import articleViewer from "../../view/articleViewer";

function parseArticleListQuery(query: ParsedQs) {
  let { tag, author, favorited } = query;
  const { limit, offset } = query;
  tag = tag ? (tag as string) : undefined;
  author = author ? (author as string) : undefined;
  favorited = favorited ? (favorited as string) : undefined;
  const limitNumber = limit ? parseInt(limit as string) : undefined;
  const offsetNumber = offset ? parseInt(offset as string) : undefined;
  return { tag, author, favorited, limit: limitNumber, offset: offsetNumber };
}

/**
 * Article controller that must receive a request.
 * @param req Request with an optional jwt token verified
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export default async function articlesList(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { tag, author, favorited, limit, offset } = parseArticleListQuery(
    req.query
  );
  const username = req.auth?.user?.username;
  const after = req.query.after ? String(req.query.after) : undefined;

  try {
    // Get current user
    const currentUser = await userGetPrisma(username);

    // ?after=<slug> continues the list after that article.
    let before: Date | undefined;
    if (after) {
      const cursor = await articleGetPrisma(after);
      if (!cursor) return res.sendStatus(404);
      before = cursor.updatedAt;
    }

    // Get the articles
    const articles = await articlesListPrisma(
      tag,
      author,
      favorited,
      limit,
      offset,
      before
    );

    // Create articles view
    const articlesListView = articles.map((article) =>
      currentUser ? articleViewer(article, currentUser) : articleViewer(article)
    );

    return res.json({
      articles: articlesListView,
      articlesCount: articlesListView.length,
    });
  } catch (error) {
    return next(error);
  }
}
