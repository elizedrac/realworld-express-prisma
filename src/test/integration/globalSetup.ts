import { execSync } from "child_process";

/**
 * Resets the test database to match prisma/schema.prisma before the suite runs.
 * Refuses to run against anything that is not clearly a test database, since the reset drops all data.
 */
export default function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url || !/_test(\?|$)/.test(url)) {
    throw new Error(
      `Refusing to reset database: DATABASE_URL must point to a *_test database (got ${url}).`
    );
  }
  execSync("npx prisma db push --force-reset --skip-generate", {
    stdio: "ignore",
  });
}
