// .cts files are always treated as CommonJS, regardless of the nearest package.json "type".
type Token = {
  value: string;
};

const tokens: Record<string, Token> = {
  foo: { value: 'bar' },
  bar: { value: '{foo}' },
};

module.exports = tokens;
