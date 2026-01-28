export default {
    testEnvironment: 'node',
    verbose: true,
    transform: {
      '^.+\\.js$': 'babel-jest',
    },
    testMatch: ['**/tests/**/*.test.js'],
    setupFilesAfterEnv: ['./tests/setup.js']
  };
