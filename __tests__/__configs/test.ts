// A TypeScript config file, loaded natively by runtimes that support type stripping.
type Config = {
  source: string[];
  platforms: Record<string, unknown>;
};

const config: Config = {
  source: ['__tests__/__json_files/typescript/*.ts'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: '__tests__/__output/typescript/',
      files: [{ destination: 'variables-from-config.css', format: 'css/variables' }],
    },
  },
};

export default config;
