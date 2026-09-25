import type { Config } from '../../types/Config.js';

const config: Config = {
  source: ['__node_tests__/__ts_files/tokens.ts', '__node_tests__/__ts_files/*.mts'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: '__tests__/__output/',
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables',
        },
      ],
    },
  },
};

export default config;
