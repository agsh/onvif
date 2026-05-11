/** @type {import('ts-jest').JestConfigWithTsJest} * */
module.exports = {
  testEnvironment: 'node',
  testRegex: '/__tests__/.*.test.ts$',
  transform: {
    '.ts$': ['ts-jest', {}],
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['json', 'lcov', 'text', 'json-summary'],
  // setupFilesAfterEnv : ['<rootDir>/__tests__/setup.ts'],
  // globalSetup: '',
};
