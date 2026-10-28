import { PrismaClient } from "@prisma/client";
import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import { DeepMockProxy, mockDeep, mockReset } from "jest-mock-extended";
import prisma from "../utils/db/prisma";
import * as articles from "./articlesController";
import * as comments from "./commentsController";
import * as profile from "./profileController";
import { userGet, userUpdate } from "./userController";
import { usersLogin, usersRegister } from "./usersController";

// Covers the guard and error paths that the integration suite cannot reach over HTTP.

jest.mock("../utils/db/prisma", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

type Controller = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

const request = {
  params: { slug: "slug", username: "bob", id: "1" },
  query: {},
  body: {
    article: { title: "t", description: "d", body: "b" },
    comment: { body: "c" },
    user: { email: "a@mail.com", password: "pw", username: "alice" },
  },
};

const authenticated = { ...request, auth: { user: { username: "alice" } } };

const mockUser = {
  username: "alice",
  email: "a@mail.com",
  password: "hash",
  bio: null,
  image: null,
  follows: [],
  followedBy: [],
  authored: [],
  favorites: [],
};

async function run(controller: Controller, req: object) {
  const res = mockResponse();
  const next = jest.fn();
  await controller(req as unknown as Request, res as unknown as Response, next);
  return { res, next };
}

describe("controllers that require a current user", () => {
  const cases: Array<[string, Controller, number]> = [
    ["articlesCreate", articles.articlesCreate, 401],
    ["articlesDelete", articles.articlesDelete, 401],
    ["articlesFavorite", articles.articlesFavorite, 401],
    ["articlesFeed", articles.articlesFeed, 401],
    ["articlesUnFavorite", articles.articlesUnFavorite, 401],
    ["articlesUpdate", articles.articlesUpdate, 401],
    ["createComment", comments.createComment, 401],
    ["deleteComment", comments.deleteComment, 401],
    ["followProfile", profile.followProfile, 401],
    ["unFollowProfile", profile.unFollowProfile, 401],
    ["userGet", userGet, 404],
    ["userUpdate", userUpdate, 404],
  ];

  test.each(cases)(
    "%s rejects a request without auth",
    async (_name, controller, status) => {
      const { res, next } = await run(controller, request);
      expect(res.sendStatus).toHaveBeenCalledWith(status);
      expect(next).not.toHaveBeenCalled();
    }
  );
});

describe("controllers pass database errors to next", () => {
  const cases: Array<[string, Controller]> = [
    ["articlesCreate", articles.articlesCreate],
    ["articlesDelete", articles.articlesDelete],
    ["articlesFavorite", articles.articlesFavorite],
    ["articlesFeed", articles.articlesFeed],
    ["articlesGet", articles.articlesGet],
    ["articlesList", articles.articlesList],
    ["articlesUnFavorite", articles.articlesUnFavorite],
    ["articlesUpdate", articles.articlesUpdate],
    ["createComment", comments.createComment],
    ["deleteComment", comments.deleteComment],
    ["getComments", comments.getComments],
    ["followProfile", profile.followProfile],
    ["getProfile", profile.getProfile],
    ["unFollowProfile", profile.unFollowProfile],
    ["userGet", userGet],
    ["usersLogin", usersLogin],
  ];

  test.each(cases)("%s", async (_name, controller) => {
    const error = new Error("database is down");
    prismaMock.user.findUnique.mockRejectedValue(error);
    const { next } = await run(controller, authenticated);
    expect(next).toHaveBeenCalledWith(error);
  });

  test("userUpdate", async () => {
    const error = new Error("database is down");
    prismaMock.user.update.mockRejectedValue(error);
    const { next } = await run(userUpdate, authenticated);
    expect(next).toHaveBeenCalledWith(error);
  });

  test("usersRegister", async () => {
    const error = new Error("database is down");
    prismaMock.user.create.mockRejectedValue(error);
    const { next } = await run(usersRegister, request);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("usersLogin", () => {
  test("returns 404 when no email is given", async () => {
    const { res } = await run(usersLogin, {
      body: { user: { password: "pw" } },
    });
    expect(res.sendStatus).toHaveBeenCalledWith(404);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});

describe.each([
  ["articlesFavorite", articles.articlesFavorite],
  ["articlesUnFavorite", articles.articlesUnFavorite],
])("%s defensive guards", (_name, controller) => {
  test("returns 404 when the update yields no article", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.article.update.mockResolvedValue(null as never);
    const { res } = await run(controller, authenticated);
    expect(res.sendStatus).toHaveBeenCalledWith(404);
  });

  test("returns 500 when the user disappears after the update", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(null);
    prismaMock.article.update.mockResolvedValue({} as never);
    const { res } = await run(controller, authenticated);
    expect(res.sendStatus).toHaveBeenCalledWith(500);
  });
});

describe("deleteComment defensive guard", () => {
  test("returns 500 when the delete yields no comment", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.comment.findFirstOrThrow.mockResolvedValue({} as never);
    prismaMock.comment.delete.mockResolvedValue(null as never);
    const { res } = await run(comments.deleteComment, authenticated);
    expect(res.sendStatus).toHaveBeenCalledWith(500);
  });
});
