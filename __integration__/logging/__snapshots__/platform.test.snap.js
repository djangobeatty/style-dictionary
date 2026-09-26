/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["integration logging platform should throw and notify users of unknown actions"] = 
`Cannot read properties of undefined (reading 'undo')`;
/* end snapshot integration logging platform should throw and notify users of unknown actions */

snapshots["integration logging platform should throw and notify users of unknown transforms"] = 
`
Unknown transforms "foo", "bar" found in platform "css":
None of "foo", "bar" match the name of a registered transform.
`;
/* end snapshot integration logging platform should throw and notify users of unknown transforms */

snapshots["integration logging platform should throw and notify users of unknown transformGroups"] = 
`
Unknown transformGroup "foo" found in platform "css":
"foo" does not match the name of a registered transformGroup.
`;
/* end snapshot integration logging platform should throw and notify users of unknown transformGroups */

snapshots["integration logging platform property reference errors should throw and notify users of unknown references"] = 
`
Property Reference Errors:
1 reference error found. Re-run with verbosity "verbose" (e.g. --verbose when using the CLI) to see details.

Problems were found when trying to resolve property references`;
/* end snapshot integration logging platform property reference errors should throw and notify users of unknown references */

snapshots["integration logging platform property reference errors circular references should throw and notify users"] = 
`
Property Reference Errors:
2 reference errors found. Re-run with verbosity "verbose" (e.g. --verbose when using the CLI) to see details.

Problems were found when trying to resolve property references`;
/* end snapshot integration logging platform property reference errors circular references should throw and notify users */

snapshots["integration logging platform property reference errors should show every reference error, its reference chain and file with verbose logging"] = 
`
Property Reference Errors:
Reference doesn't exist: color.danger.value tries to reference color.red.value, which is not defined.
Reference chain: color.danger.value -> color.red.value
Token color.danger.value is defined in file: __integration__/tokens/logging/_broken_refs.json
Reference doesn't exist: color.alert.value tries to reference color.red.value, which is not defined.
Reference chain: color.alert.value -> color.danger.value -> color.red.value
Token color.alert.value is defined in file: __integration__/tokens/logging/_broken_refs.json

Problems were found when trying to resolve property references`;
/* end snapshot integration logging platform property reference errors should show every reference error, its reference chain and file with verbose logging */

snapshots["integration logging platform property reference errors should show the files of the tokens in a circular reference cycle with verbose logging"] = 
`
Property Reference Errors:
Circular definition cycle:  color.teal.value, color.blue.value, color.green.value, color.teal.value
Detected while resolving color.teal.value, which is defined in file: __integration__/tokens/logging/_circular_refs.json
Tokens in this cycle are defined in files:
color.teal.value: __integration__/tokens/logging/_circular_refs.json
color.blue.value: __integration__/tokens/logging/_circular_refs.json
color.green.value: __integration__/tokens/logging/_circular_refs.json

Problems were found when trying to resolve property references`;
/* end snapshot integration logging platform property reference errors should show the files of the tokens in a circular reference cycle with verbose logging */

