/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testMatch: ["<rootDir>/src/test/integration/**/*.int.test.ts"],
  globalSetup: "<rootDir>/src/test/integration/globalSetup.ts",
  setupFilesAfterEnv: ["<rootDir>/src/test/integration/setup.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/test/**",
    "!src/utils/test/**",
    "!src/server.ts",
  ],
};
