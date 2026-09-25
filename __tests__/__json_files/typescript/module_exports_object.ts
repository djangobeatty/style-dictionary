// Type annotations are stripped by runtimes that support TypeScript natively,
// e.g. Node.js with type stripping, Bun or Deno.
type Token = {
  value: string;
};

const tokens: Record<string, Token> = {
  foo: { value: 'bar' },
  bar: { value: '{foo}' },
};

export default tokens;
