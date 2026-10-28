import prisma from "../../utils/db/prisma";
import logger from "../../utils/logger";

// Expected error paths log loudly; keep test output readable.
logger.silent = true;

// Every test starts from an empty database. CASCADE also clears the implicit many-to-many tables.
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Comment", "Article", "Tag", "User" RESTART IDENTITY CASCADE'
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
