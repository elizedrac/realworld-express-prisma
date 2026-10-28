/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  // eval/ holds conflict-detection oracles that run only inside verify worktrees.
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/src/test/integration/",
    "<rootDir>/eval/",
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/test/**",
    "!src/utils/test/**",
    "!src/server.ts",
  ],
};
