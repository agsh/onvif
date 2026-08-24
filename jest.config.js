/** @type {import('ts-jest').JestConfigWithTsJest} * */
module.exports = {
  testEnvironment: 'node',
  testRegex: '/__tests__/.*.test.ts$',
  transform: {
    '.ts$': [
      'ts-jest',
      {
        // TypeScript 7 defaults `types` to []; tests still need Jest globals.
        tsconfig: {
          types: ['node', 'jest'],
        },
      },
    ],
  },
  // Happytime integration suites share one process; connect/reboot recovery can exceed 5s.
  testTimeout: 30_000,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/interfaces/**', '!src/index.ts'],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['json', 'lcov', 'text', 'json-summary'],
  // setupFilesAfterEnv : ['<rootDir>/__tests__/setup.ts'],
  // globalSetup: '',
};
