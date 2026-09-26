// Including paddings twice guarantees token collisions, which is what the
// logging CLI options are tested against.
export default {
  source: ['__tests__/__tokens/paddings.json', '__tests__/__tokens/_paddings.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: '__tests__/__output/',
      files: [
        {
          destination: 'collisions.css',
          format: 'css/variables',
        },
      ],
    },
  },
};
