# Style Dictionary Integration Tests

Style Dictionary is a tool to generate valid source code for multiple platforms and languages to consume. Because of this, unit testing can only get us so far. Simply unit testing or even basic snapshot testing of outputs doesn't give the whole picture.

The integration tests here are meant to show complete end-to-end examples of Style Dictionary being used in order to validate the files it is generating.

The integration tests still use snapshots, but rather than singling out format code, each test group builds a complete Style Dictionary and then tests the content of the output files with snapshots and validating syntax where possible.

Not every assertion has to be a snapshot. When a config option is supposed to change or suppress part of the output, the strongest assertion is a second build of equivalent input compared against the first — `expect(output).to.equal(equivalentOutput)` catches placeholder junk that a "does not contain X" check waves through.

## To do

- Snapshots are a good built-in way to test if content has changed, but storing the contents of a source code file like a CSS variables file doesn't get proper syntax highlighting and validation in IDEs. It would be better if we could store the raw output file and test against the new contents, but snapshot testing does not allow for that.
- Add more syntax validations
