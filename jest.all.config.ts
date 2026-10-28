import unit from "./jest.config";
import integration from "./jest.integration.config";

/** Runs unit and integration tests together so coverage is reported once. */
export default {
  projects: [
    { ...unit, displayName: "unit" },
    { ...integration, displayName: "integration" },
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/test/**",
    "!src/utils/test/**",
    "!src/server.ts",
  ],
};
