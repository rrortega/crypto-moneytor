// .mocharc.cjs (CommonJS)
module.exports = {
  spec: 'src/tests/**/*.spec.ts',
  timeout: 10000,
  retries: 2,
  color: true,
  reporter: 'spec',
  bail: false,
  require: ['dotenv/config'],
  file: ['src/tests/setup.ts'],
  nodeOption: ['--no-warnings'],
};
