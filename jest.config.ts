import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};

const jestConfig = createJestConfig(config);

const extendedJestConfig = async () => {
  const resolved = await (jestConfig as () => Promise<Config>)();
  // Allow bson (ESM .mjs) to be transformed by Jest in pnpm's nested node_modules
  resolved.transformIgnorePatterns = [
    '/node_modules/(?!.pnpm)(?!(geist|next/dist/client|next/dist/shared/lib|next/src/client|next/src/shared/lib|bson|mongodb|mongoose)/)',
    '/node_modules[\\\\/]\\.pnpm[\\\\/](?!(geist|next\\+dist\\+client|next\\+dist\\+shared\\+lib|next\\+src\\+client|next\\+src\\+shared\\+lib|bson|mongodb|mongoose)@)(?!.*node_modules[\\\\/](geist|next[\\\\/]dist[\\\\/]client|next[\\\\/]dist[\\\\/]shared[\\\\/]lib|next[\\\\/]src[\\\\/]client|next[\\\\/]src[\\\\/]shared[\\\\/]lib|bson|mongodb|mongoose)[\\\\/])',
    '^.+\\.module\\.(css|sass|scss)$',
  ];
  return resolved;
};

export default extendedJestConfig;
