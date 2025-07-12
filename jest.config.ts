/*eslint-disable*/
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm', // Required for ESM + TS
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'], // Treat .ts files as ESM

  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json'
    }],
    '^.+\\.js$': 'babel-jest', // Fallback for ESM JS files
  },

  transformIgnorePatterns: [
    'node_modules/(?!(@dynamatix/cat-shared|@dynamatix/gb-schemas)/)'
  ],

  modulePaths: [
    '<rootDir>'
  ],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Resolve ESM imports correctly
    'src/apps/applications/usecases/application-assign.usecase$': '<rootDir>/src/apps/applications/usecases/application-assign.usecase.ts',
    'src/infrastructure/error-handling/throw-error.utils$': '<rootDir>/src/_mocks/throw-error.utils.ts',
    '^@dynamatix/cat-shared/services$': '<rootDir>/src/_mocks/cat-shared-services.ts',
    // '^@dynamatix/cat-shared/models$': '<rootDir>/src/_mocks/cat-shared-models.ts',
    '^@dynamatix/cat-shared(.*)$': '<rootDir>/node_modules/@dynamatix/cat-shared$1',
    '^@dynamatix/gb-schemas(.*)$': '<rootDir>/src/_mocks/gb-schemas.ts',
    // '^@dynamatix/gb-schemas(.*)$': '<rootDir>/node_modules/@dynamatix/gb-schemas/dist$1',
  },

  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  verbose: true
};

export default config;