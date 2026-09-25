type Token = {
  value: string;
};

type Tokens = Record<string, Token>;

// Type checks that this token file has the exact same shape as our other themes
const tokens: Tokens = {
  ts: { value: 'ts module' },
  tsRef: { value: '{ts}' },
};

export default tokens;
