module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/__tests__/**/api.test.cjs"],
  collectCoverageFrom: ["property-service.js", "!**/node_modules/**"],
  coveragePathIgnorePatterns: ["/node_modules/"],
  transformIgnorePatterns: ["node_modules"],
  moduleNameMapper: {},
  setupFilesAfterEnv: [],
  testTimeout: 15000,
};
