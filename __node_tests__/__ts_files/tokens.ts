import type { DesignTokens } from '../../types/DesignToken.js';

// the type annotations here are what make this a TypeScript file rather than a JavaScript one,
// they have to be stripped by the runtime before it can be imported
const tokens: DesignTokens = {
  color: {
    red: { value: '#ff0000', type: 'color' },
  },
};

export default tokens;
