import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "express-jwt";
import logger from "../../utils/logger";
import authErrorHandler from "./authErrorHandler";
import prismaErrorHandler from "./prismaErrorHandler";

logger.silent = true;

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

async function handle(
  handler: typeof authErrorHandler,
  err: Error
): Promise<{ res: ReturnType<typeof mockResponse>; next: jest.Mock }> {
  const res = mockResponse();
  const next = jest.fn();
  await handler(
    err,
    {} as Request,
    res as unknown as Response,
    next as unknown as NextFunction
  );
  return { res, next };
}

describe("authErrorHandler", () => {
  test("passes other errors on", async () => {
    const err = new Error("other");
    const { next } = await handle(authErrorHandler, err);
    expect(next).toHaveBeenCalledWith(err);
  });

  test("returns 400 for a bad scheme", async () => {
    const { res } = await handle(
      authErrorHandler,
      new UnauthorizedError("credentials_bad_scheme", { message: "bad" })
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: { header: ["authorization token with bad scheme"] },
    });
  });

  test("returns 500 for an unhandled code", async () => {
    const { res } = await handle(
      authErrorHandler,
      new UnauthorizedError("revoked_token", { message: "revoked" })
    );
    expect(res.sendStatus).toHaveBeenCalledWith(500);
  });
});

describe("prismaErrorHandler", () => {
  test("passes other errors on", async () => {
    const err = new Error("other");
    const { next } = await handle(prismaErrorHandler, err);
    expect(next).toHaveBeenCalledWith(err);
  });

  test("reports the cause of a P2025 error", async () => {
    const err = new PrismaClientKnownRequestError("not found", {
      code: "P2025",
      clientVersion: "4",
      meta: { cause: "Record to update not found." },
    });
    const { res } = await handle(prismaErrorHandler, err);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      errors: ["Record to update not found."],
    });
  });
});
