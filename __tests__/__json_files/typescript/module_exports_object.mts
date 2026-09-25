// .mts files are always treated as ES modules, regardless of the nearest package.json "type".
type Token = {
  value: string;
};

const tokens: Record<string, Token> = {
  foo: { value: 'bar' },
  bar: { value: '{foo}' },
};

export default tokens;
